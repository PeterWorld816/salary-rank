// Dynamic per-share OG image, in two modes:
//  - Personal (?d=...&st=...): for /us/result/*, where the percentile is
//    this specific visitor's own answer. See lib/seo.ts's resultOgImage().
//  - Location (?loc=...&median=...&percentile=...): for the state/county/
//    place pages, where there's no visitor input at generateMetadata time —
//    just that location's own median income and its national percentile,
//    the same public numbers those pages already show in their own body
//    copy. See lib/seo.ts's locationOgImage().
// Built on next/og's ImageResponse — satori (JSX/CSS -> SVG) + resvg (SVG ->
// PNG) under the hood, on the edge runtime, deliberately not a headless
// browser: this needs to render in milliseconds per request, not seconds.
//
// This is a plain Route Handler rather than the opengraph-image.tsx file
// convention — Next's generated wrapper for that convention discards the
// incoming Request and only forwards route `params`, so a file-convention
// image can never see the query string a shared result link actually
// carries.
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import nationalIncomeData from "@/data/us/nationalIncome.json";
import { getPercentileRankFromTable, clampDisplayPercent, type PercentileAnchor } from "@/lib/percentileTable";
import { decodeUsInput, US_AGE_BANDS } from "@/lib/usInput";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { formatUsd } from "@/lib/usFormat";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;
const BG = "#08090A";
const FONT_FAMILY = "Noto Sans KR"; // covers Latin + Hangul, so one font serves both locales

const COPY = {
  en: { fallback: "What's Your Income Percentile?", top: (p: number) => `Top ${p}%` },
  ko: { fallback: "미국 소득 상위 몇 %?", top: (p: number) => `상위 ${p}%` },
} as const;

// Only the national anchor table (~1.5KB) — deliberately not importing
// lib/usIncomeCalc.ts for exports (state/net-worth/401k tables) this edge
// route never touches, to keep its cold start minimal.
function getNationalPercentile(annualIncome: number): number | null {
  const anchors = nationalIncomeData.percentileAnchors as PercentileAnchor[];
  if (anchors.length < 2) return null;
  return clampDisplayPercent(getPercentileRankFromTable(anchors, annualIncome));
}

// Fetches only the glyphs this render needs, as a TTF (an old-Chrome UA makes
// Google's css2 endpoint serve ttf instead of woff2, which is all satori can
// parse) — the standard trick for getting Hangul into ImageResponse without
// vendoring a multi-MB font file into the repo. Returns [] on any failure so
// a network hiccup degrades to the default font rather than a 500.
async function loadFont(text: string): Promise<{ name: string; data: ArrayBuffer; weight: 700; style: "normal" }[]> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`;
    const css = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
      },
    }).then((res) => res.text());
    const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
    if (!match) return [];
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return [];
    const data = await fontRes.arrayBuffer();
    return [{ name: FONT_FAMILY, data, weight: 700, style: "normal" }];
  } catch (err) {
    console.error("[/us/og] font fetch failed", err);
    return [];
  }
}

function Card({ top, sub }: { top: string; sub?: string }) {
  const topStyle: Record<string, string | number> = {
    display: "flex",
    fontSize: sub ? 150 : 64,
    fontWeight: 700,
    lineHeight: 1.05,
    textAlign: sub ? "left" : "center",
  };
  if (!sub) topStyle.maxWidth = WIDTH - 120;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: sub ? "space-between" : "center",
        alignItems: sub ? "flex-start" : "center",
        backgroundColor: BG,
        padding: 60,
        color: "#FFFFFF",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div style={topStyle}>{top}</div>
      {sub && <div style={{ display: "flex", fontSize: 40, fontWeight: 700, opacity: 0.75 }}>{sub}</div>}
    </div>
  );
}

// Location mode's layout — location name, then the big percentile, then the
// median-income line, grouped together (not spread top/bottom like Card's
// personal mode) since all three numbers are the point here, not just one
// hero stat with a caption.
function LocationCard({ heading, location, detail }: { heading: string; location: string; detail?: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        backgroundColor: BG,
        padding: 60,
        color: "#FFFFFF",
        fontFamily: FONT_FAMILY,
      }}
    >
      <div style={{ display: "flex", fontSize: 40, fontWeight: 700, opacity: 0.75, marginBottom: 8, maxWidth: WIDTH - 120 }}>{location}</div>
      <div style={{ display: "flex", fontSize: 130, fontWeight: 700, lineHeight: 1.05 }}>{heading}</div>
      {detail && <div style={{ display: "flex", fontSize: 36, fontWeight: 700, opacity: 0.6, marginTop: 20 }}>{detail}</div>}
    </div>
  );
}

// Every response here is a pure function of its query params — same params
// always produce the same PNG — so it's safe to cache aggressively at the
// edge/CDN. stale-while-revalidate lets an already-cached image keep being
// served instantly while a (rare — these URLs don't change per visitor)
// revalidation happens in the background.
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lang = searchParams.get("lang") === "ko" ? "ko" : "en";
  const copy = COPY[lang];
  const loc = searchParams.get("loc");

  let node: React.ReactElement;
  let textForFont: string;

  if (loc) {
    // ── Location mode — state/county/place pages' own median income and
    // national percentile, no visitor input involved. ──
    const percentileRaw = Number(searchParams.get("percentile"));
    const percentile = Number.isFinite(percentileRaw) && percentileRaw > 0 ? percentileRaw : null;
    const medianRaw = Number(searchParams.get("median"));
    const median = Number.isFinite(medianRaw) && medianRaw > 0 ? medianRaw : null;

    const heading = percentile != null ? copy.top(percentile) : copy.fallback;
    const detail = median != null ? (lang === "ko" ? `가구 중위소득 ${formatUsd(median)}` : `Median household income ${formatUsd(median)}`) : undefined;

    node = <LocationCard heading={heading} location={loc} detail={detail} />;
    textForFont = `${heading}${loc}${detail ?? ""}`;
  } else {
    // ── Personal mode — this visitor's own ?d= answer. ──
    const input = decodeUsInput(searchParams.get("d") ?? "");
    const percentile = input ? getNationalPercentile(input.annualIncome) : null;

    let top: string;
    let sub: string | undefined;
    if (!input || percentile == null) {
      top = copy.fallback;
      sub = undefined;
    } else {
      const state = getStateByAbbr(searchParams.get("st") ?? "");
      const ageBand = US_AGE_BANDS.find((b) => b.id === input.ageBand);
      top = copy.top(percentile);
      sub = [ageBand?.label[lang], state?.name, formatUsd(input.annualIncome)].filter(Boolean).join(" · ");
    }

    node = <Card top={top} sub={sub} />;
    textForFont = `${top}${sub ?? ""}`;
  }

  // An explicit empty `fonts` array (as opposed to omitting the option
  // entirely) makes @vercel/og throw "No fonts are loaded" instead of
  // falling back to its bundled default — so only pass it through when the
  // Google Fonts fetch actually produced something.
  const fonts = await loadFont(textForFont);

  return new ImageResponse(node, {
    width: WIDTH,
    height: HEIGHT,
    ...(fonts.length ? { fonts } : {}),
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
