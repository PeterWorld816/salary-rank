// Single source for the "share title / description" strings used in three
// separate places: ResultClient (native share sheet), app/result/page.tsx
// (OG metadata), and app/api/og/route.tsx (OG image). Pure function — safe in
// edge runtime.

import { translations, pick, formatTemplate, formatManwon, type LangCode } from "@/lib/i18n";
import type { SalaryInput, SalaryRankResult } from "@/lib/salaryCalc";
import { getAgeGroup, getIndustry, getRegion } from "@/lib/salaryCalc";
import type { NetWorthRankResult } from "@/lib/netWorthCalc";

export function buildResultShareText(
  lang: LangCode,
  input: SalaryInput,
  rankResult: SalaryRankResult,
  netWorthResult?: NetWorthRankResult | null
) {
  const t = translations[lang];

  const title = formatTemplate(t.shareTitle, {
    percent: rankResult.percentileRounded,
    annual: formatManwon(rankResult.annual, lang),
  });

  const fmtTop = (percent: number) => formatTemplate(t.topPercentTemplate, { percent });
  const ageLabel = pick(getAgeGroup(input.ageGroup).label, lang);
  const industryLabel = pick(getIndustry(input.industry).label, lang);
  const regionLabel = pick(getRegion(input.region).label, lang);

  const parts = [
    `${t.comparisonAge}(${ageLabel}) ${fmtTop(rankResult.groupComparisons.ageGroup)}`,
    `${t.comparisonIndustry}(${industryLabel}) ${fmtTop(rankResult.groupComparisons.industry)}`,
    `${t.comparisonRegion}(${regionLabel}) ${fmtTop(rankResult.groupComparisons.region)}`,
  ];
  if (netWorthResult) {
    parts.push(`${t.assetSectionTitle} ${fmtTop(netWorthResult.percentileRounded)}`);
  }

  const description = parts.join(" · ");

  return { title, description };
}
