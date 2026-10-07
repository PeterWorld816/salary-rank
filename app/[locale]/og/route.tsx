import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { getReceiptGrade, receiptRankFromPercent, RECEIPT_IMAGE_HEIGHT, RECEIPT_IMAGE_WIDTH } from "@/lib/receiptCard";
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

let receiptFontsPromise:
  | Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" }[]>
  | undefined;

async function loadReceiptFonts() {
  receiptFontsPromise ??= Promise.all([
    fetch(new URL("/fonts/archivo-black.ttf", getSiteUrl())),
    fetch(new URL("/fonts/courier-prime-regular.ttf", getSiteUrl())),
    fetch(new URL("/fonts/courier-prime-bold.ttf", getSiteUrl())),
  ]).then(async ([archivo, courierRegular, courierBold]) => {
    for (const response of [archivo, courierRegular, courierBold]) {
      if (!response.ok) throw new Error(`Receipt font request failed: ${response.status}`);
    }
    const [archivoData, courierRegularData, courierBoldData] = await Promise.all([
      archivo.arrayBuffer(),
      courierRegular.arrayBuffer(),
      courierBold.arrayBuffer(),
    ]);
    return [
      { name: "Archivo Black", data: archivoData, weight: 400 as const, style: "normal" as const },
      { name: "Courier Prime", data: courierRegularData, weight: 400 as const, style: "normal" as const },
      { name: "Courier Prime", data: courierBoldData, weight: 700 as const, style: "normal" as const },
    ];
  });
  return receiptFontsPromise;
}

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

function ReceiptImage({
  percent,
  age,
  agePercent,
  state,
  statePercent,
}: {
  percent: number;
  age: string | null;
  agePercent: number | null;
  state: string | null;
  statePercent: number | null;
}) {
  const rank = receiptRankFromPercent(percent);
  const grade = getReceiptGrade(rank);
  const rows = [
    { label: "NATIONWIDE", percent },
    age && agePercent != null ? { label: `AGE BAND · ${age.toUpperCase()}`, percent: agePercent } : null,
    state && statePercent != null ? { label: `STATE · ${state}`, percent: statePercent } : null,
  ].filter((row): row is { label: string; percent: number } => row != null);
  const textStyle = { display: "flex", fontFamily: "Courier Prime", color: "#1b1b18" };

  return (
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: grade.background, padding: 36, boxSizing: "border-box" }}>
      <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", backgroundColor: "#f7f4ea", color: "#1b1b18", padding: "48px 66px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, borderBottom: "3px dashed #9c998e", paddingBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...textStyle, fontFamily: "Archivo Black", fontSize: 57 }}>INCOME RECEIPT</span>
            <span style={{ ...textStyle, fontSize: 27, fontWeight: 700 }}>US · 001</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 25, fontWeight: 700 }}>
            <span style={{ ...textStyle }}>SHOPPER</span>
            <span style={{ ...textStyle }}>100 AMERICANS</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 36 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ ...textStyle, fontSize: 27, fontWeight: 700, letterSpacing: "0.05em" }}>YOUR PLACE IN LINE</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 15, fontFamily: "Archivo Black", lineHeight: 1 }}>
              <span style={{ display: "flex", fontSize: 192, letterSpacing: "-0.06em" }}>#{rank}</span>
              <span style={{ display: "flex", fontSize: 51 }}>/ 100</span>
            </div>
            <span style={{ ...textStyle, fontSize: 27 }}>{100 - rank} behind you</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center", width: 330, height: 240, flexShrink: 0, gap: "6px 12px" }}>
            {Array.from({ length: 100 }, (_, index) => {
              const position = index + 1;
              const isYou = position === rank;
              const ahead = position < rank;
              return (
                <span
                  key={position}
                  style={{
                    display: "flex",
                    flex: "0 0 auto",
                    width: isYou ? 24 : 18,
                    height: isYou ? 24 : 18,
                    borderRadius: "50%",
                    backgroundColor: isYou ? grade.background : ahead ? "#25251f" : "#d7d0bd",
                    ...(isYou
                      ? {
                          border: "4px solid #1b1b18",
                          boxShadow: `0 0 0 4px ${grade.background}`,
                        }
                      : {}),
                    boxSizing: "border-box",
                  }}
                />
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "3px dashed #9c998e", borderBottom: "3px dashed #9c998e", padding: "18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 27 }}>
            <div style={{ display: "flex", width: 192, height: 192, flexShrink: 0, alignItems: "center", justifyContent: "center", transform: "rotate(-8deg)", border: `8px solid ${grade.background}`, color: grade.background, fontFamily: "Archivo Black", fontSize: 120, lineHeight: 1 }}>
              {grade.label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
              <span style={{ ...textStyle, fontSize: 25, fontWeight: 700, letterSpacing: "0.06em" }}>INCOME GRADE</span>
              <span style={{ ...textStyle, fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>{grade.line}</span>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                {["S", "A+", "A", "B+", "B", "C+", "C", "D"].map((label) => (
                  <span key={label} style={{ ...textStyle, minWidth: 30, justifyContent: "center", border: "2px solid #77746b", padding: "1px 3px", fontSize: 19, fontWeight: label === grade.label ? 700 : 400, backgroundColor: label === grade.label ? grade.background : "transparent", color: label === grade.label ? "#fff" : "#1b1b18" }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, fontSize: 29 }}>
              <span style={{ ...textStyle, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
              <span style={{ ...textStyle, flexShrink: 0, fontWeight: 700 }}>#{receiptRankFromPercent(row.percent)} / 100</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", minHeight: 72, position: "relative", alignItems: "center", overflow: "hidden" }}>
          <div aria-hidden="true" style={{ display: "flex", width: "100%", height: 48, justifyContent: "space-between", alignItems: "stretch" }}>
            {Array.from({ length: 96 }, (_, index) => (
              <span key={index} style={{ display: "flex", width: index % 7 === 0 ? 4 : index % 3 === 0 ? 3 : 2, backgroundColor: "#1b1b18", flexShrink: 0 }} />
            ))}
          </div>
          <span style={{ display: "flex", position: "absolute", right: 12, bottom: 0, transform: "rotate(-11deg)", border: `6px solid ${grade.background}`, color: grade.background, padding: "9px 15px", fontFamily: "Archivo Black", fontSize: 28, lineHeight: 1, whiteSpace: "nowrap" }}>
            {grade.stamp}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 20, lineHeight: 1.1 }}>
          <span style={{ ...textStyle }}>THANK YOU. COME RANK AGAIN.</span>
          <span style={{ ...textStyle, fontFamily: "Archivo Black", fontSize: 21 }}>salary-statistics.netlify.app</span>
        </div>
        <span style={{ ...textStyle, justifyContent: "center", fontSize: 16, lineHeight: 1.1, textAlign: "center" }}>
          For fun. Grades are not a measure of your worth.
        </span>
      </div>
    </div>
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
      const state = getStateByAbbr(stateRaw)?.abbr ?? null;
      const agePercent = age ? readOptionalPercent(searchParams, "pa") : null;
      const statePercent = state ? readOptionalPercent(searchParams, "ps") : null;
      node = <ReceiptImage percent={percentile} age={age} agePercent={agePercent} state={state} statePercent={statePercent} />;
      width = RECEIPT_IMAGE_WIDTH;
      height = RECEIPT_IMAGE_HEIGHT;
      fonts = await loadReceiptFonts();
    }
  }

  return new ImageResponse(node, {
    width,
    height,
    ...(fonts.length ? { fonts } : {}),
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
