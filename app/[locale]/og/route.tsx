import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getStateByAbbr } from "@/data/us/stateMeta";
import ShieldShareCard, {
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_WIDTH,
  STORY_IMAGE_HEIGHT,
  STORY_IMAGE_WIDTH,
  type ShieldRankRow,
} from "@/components/us/ShieldShareCard";
import { getSiteUrl } from "@/lib/site-url";
import { formatUsd } from "@/lib/usFormat";

export const runtime = "edge";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const BG = "#08090A";
const FONT_FAMILY = "Noto Sans KR";

const COPY = {
  en: { fallback: "What's Your Income Percentile?", top: (p: number) => `Top ${p}%` },
  ko: { fallback: "미국 소득 상위 몇 %?", top: (p: number) => `상위 ${p}%` },
} as const;

async function loadKoreanFont(text: string) {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`;
    const css = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36",
      },
    }).then((response) => response.text());
    const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
    if (!match) return [];
    const response = await fetch(match[1]);
    if (!response.ok) return [];
    return [{ name: FONT_FAMILY, data: await response.arrayBuffer(), weight: 700 as const, style: "normal" as const }];
  } catch (error) {
    console.error("[/us/og] Korean font fetch failed", error);
    return [];
  }
}

function Card({ top, sub }: { top: string; sub?: string }) {
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
      <div style={{ display: "flex", fontSize: sub ? 150 : 64, fontWeight: 700, lineHeight: 1.05, textAlign: sub ? "left" : "center", maxWidth: OG_WIDTH - 120 }}>{top}</div>
      {sub && <div style={{ display: "flex", fontSize: 40, fontWeight: 700, opacity: 0.75 }}>{sub}</div>}
    </div>
  );
}

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
      <div style={{ display: "flex", fontSize: 40, fontWeight: 700, opacity: 0.75, marginBottom: 8, maxWidth: OG_WIDTH - 120 }}>{location}</div>
      <div style={{ display: "flex", fontSize: 130, fontWeight: 700, lineHeight: 1.05 }}>{heading}</div>
      {detail && <div style={{ display: "flex", fontSize: 36, fontWeight: 700, opacity: 0.6, marginTop: 20 }}>{detail}</div>}
    </div>
  );
}

function PersonalShareImage({
  percent,
  age,
  agePercent,
  stateAbbr,
  location,
  statePercent,
  variant,
  metric,
}: {
  percent: number;
  age: string | null;
  agePercent: number | null;
  stateAbbr: string | null;
  location: string;
  statePercent: number | null;
  variant: "wide" | "story";
  metric: "income" | "netWorth";
}) {
  const rows: ShieldRankRow[] = [
    { label: "NATIONWIDE", percent },
    age && agePercent != null ? { label: `AGE ${age.replace("-", "–").toUpperCase()}`, percent: agePercent } : null,
    stateAbbr && statePercent != null ? { label: `IN ${location.toUpperCase()}`, percent: statePercent } : null,
  ].filter((row): row is ShieldRankRow => row != null);

  return (
    <ShieldShareCard
      variant={variant}
      percent={percent}
      rows={rows}
      location={stateAbbr ? `${location}, ${stateAbbr}` : location}
      renderScale={3}
      metric={metric}
    />
  );
}

const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

function readOptionalPercent(searchParams: URLSearchParams, key: string): number | null {
  const raw = searchParams.get(key);
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lang = searchParams.get("lang") === "ko" ? "ko" : "en";
  const copy = COPY[lang];
  const loc = searchParams.get("loc");

  let node: React.ReactElement;
  let width = OG_WIDTH;
  let height = OG_HEIGHT;
  let fonts: { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[] = [];

  if (loc) {
    const percentile = readOptionalPercent(searchParams, "percentile");
    const medianRaw = Number(searchParams.get("median"));
    const median = Number.isFinite(medianRaw) && medianRaw > 0 ? medianRaw : null;
    const heading = percentile != null ? copy.top(percentile) : copy.fallback;
    const detail = median != null ? (lang === "ko" ? `가구 중위소득 ${formatUsd(median)}` : `Median household income ${formatUsd(median)}`) : undefined;
    node = <LocationCard heading={heading} location={loc} detail={detail} />;
    const koreanFonts = await loadKoreanFont(`${heading}${loc}${detail ?? ""}`);
    fonts = koreanFonts;
  } else {
    const percentile = readOptionalPercent(searchParams, "p");
    if (percentile == null) {
      node = <Card top={copy.fallback} />;
      fonts = await loadKoreanFont(copy.fallback);
    } else {
      const ageRaw = searchParams.get("age");
      const age = ageRaw && /^[a-z0-9-]{1,12}$/i.test(ageRaw) ? ageRaw : null;
      const stateRaw = searchParams.get("st")?.toUpperCase() ?? "";
      const stateMeta = getStateByAbbr(stateRaw) ?? null;
      const state = stateMeta?.abbr ?? null;
      const agePercent = age ? readOptionalPercent(searchParams, "pa") : null;
      const statePercent = state ? readOptionalPercent(searchParams, "ps") : null;
      const variant = searchParams.get("card") === "story" ? "story" : "wide";
      const metric = searchParams.get("m") === "nw" ? "netWorth" : "income";
      node = (
        <PersonalShareImage
          percent={percentile}
          age={age}
          agePercent={agePercent}
          stateAbbr={state}
          location={stateMeta?.name ?? "United States"}
          statePercent={statePercent}
          variant={variant}
          metric={metric}
        />
      );
      width = variant === "story" ? STORY_IMAGE_WIDTH : SHARE_IMAGE_WIDTH;
      height = variant === "story" ? STORY_IMAGE_HEIGHT : SHARE_IMAGE_HEIGHT;
    }
  }

  return new ImageResponse(node, {
    width,
    height,
    ...(fonts.length ? { fonts } : {}),
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
