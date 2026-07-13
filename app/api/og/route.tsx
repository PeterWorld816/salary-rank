import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { decodeSalaryInput, computeSalaryRank, getAgeGroup, getIndustry, getRegion } from "@/lib/salaryCalc";
import { translations, pick, formatTemplate, formatCurrency, isLangCode, DEFAULT_LANG } from "@/lib/i18n";
import DistributionChart from "@/components/DistributionChart";

export const runtime = "edge";

const ACCENT = "#34D399";

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const d = params.get("d") ?? "";
  const langParam = params.get("lang");
  const lang = isLangCode(langParam) ? langParam : DEFAULT_LANG;
  const t = translations[lang];
  const input = decodeSalaryInput(d);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px", height: "630px", background: "#0D0D0D",
          display: "flex", flexDirection: "row",
          alignItems: "center", justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        <div style={{
          position: "absolute", width: "600px", height: "600px",
          top: "15px", left: "300px",
          background: "radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 65%)",
          borderRadius: "50%", display: "flex",
        }} />

        {!input ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              color: ACCENT, fontSize: 56, fontWeight: 900,
              letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 20,
              display: "flex", textAlign: "center", maxWidth: 900, justifyContent: "center",
            }}>
              {t.appTitle}
            </div>
            <div style={{
              color: "rgba(255,255,255,0.45)", fontSize: 24,
              display: "flex", textAlign: "center", maxWidth: 800, justifyContent: "center",
            }}>
              {t.tagline}
            </div>
          </div>
        ) : (
          (() => {
            const rankResult = computeSalaryRank(input);
            const rows = [
              { label: t.comparisonAge, sub: pick(getAgeGroup(input.ageGroup).label, lang), percent: rankResult.groupComparisons.ageGroup },
              { label: t.comparisonIndustry, sub: pick(getIndustry(input.industry).label, lang), percent: rankResult.groupComparisons.industry },
              { label: t.comparisonRegion, sub: pick(getRegion(input.region).label, lang), percent: rankResult.groupComparisons.region },
            ];

            return (
              <>
                <div style={{ display: "flex", marginRight: 70 }}>
                  <DistributionChart monthlySalary={rankResult.monthly.estimate} width={420} lang={lang} dark />
                </div>

                <div style={{ display: "flex", flexDirection: "column", maxWidth: 560 }}>
                  <div style={{ display: "flex", color: "rgba(255,255,255,0.4)", fontSize: 20, marginBottom: 6 }}>
                    {t.resultCardLabel}
                  </div>
                  <div style={{ display: "flex", color: "rgba(255,255,255,0.6)", fontSize: 20, marginBottom: 4 }}>
                    {t.percentileHeroLabel}
                  </div>
                  <div style={{
                    display: "flex", color: ACCENT, fontSize: 72, fontWeight: 900,
                    letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 14,
                  }}>
                    {rankResult.percentileRounded}%
                  </div>
                  <div style={{ display: "flex", color: "rgba(255,255,255,0.7)", fontSize: 22, marginBottom: 26 }}>
                    {formatTemplate(t.annualEstimateTemplate, { value: formatCurrency(rankResult.annual.estimate, lang) })}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 22 }}>
                    {rows.map((row) => (
                      <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 999, display: "flex", background: ACCENT }} />
                        <span style={{ display: "flex", fontSize: 20, color: "rgba(255,255,255,0.7)" }}>
                          {row.label}({row.sub}) {formatTemplate(t.topPercentTemplate, { percent: row.percent })}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", color: "rgba(255,255,255,0.3)", fontSize: 15 }}>
                    {t.sourceLabel}: {t.sourceText}
                  </div>
                </div>
              </>
            );
          })()
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
