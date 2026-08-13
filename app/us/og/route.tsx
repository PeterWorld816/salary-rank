// Dynamic per-share OG image for /us/result/* (and its /kr mirror). This is a
// plain Route Handler rather than the opengraph-image.tsx file convention —
// Next's generated wrapper for that convention discards the incoming Request
// and only forwards route `params`, so a file-convention image can never see
// the ?d=/?st= query string a shared result link actually carries. lib/seo.ts's
// resultOgImage() points openGraph.images/twitter.images at this URL instead,
// with the page's own search params appended.
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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lang = searchParams.get("lang") === "ko" ? "ko" : "en";
  const copy = COPY[lang];

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

  // An explicit empty `fonts` array (as opposed to omitting the option
  // entirely) makes @vercel/og throw "No fonts are loaded" instead of
  // falling back to its bundled default — so only pass it through when the
  // Google Fonts fetch actually produced something.
  const fonts = await loadFont(`${top}${sub ?? ""}`);

  return new ImageResponse(<Card top={top} sub={sub} />, {
    width: WIDTH,
    height: HEIGHT,
    ...(fonts.length ? { fonts } : {}),
  });
}
