// Single source for the "share title / description" strings used in three
// separate places: ResultClient (native share sheet), app/result/page.tsx
// (OG metadata), and app/api/og/route.tsx (OG image). Pure function — safe in
// edge runtime.

import { translations, pick, formatTemplate, formatCurrency, type LangCode } from "@/lib/i18n";
import type { SalaryInput, SalaryRankResult } from "@/lib/salaryCalc";
import { getAgeGroup, getIndustry, getRegion } from "@/lib/salaryCalc";

export function buildResultShareText(lang: LangCode, input: SalaryInput, rankResult: SalaryRankResult) {
  const t = translations[lang];

  const title = formatTemplate(t.shareTitle, {
    percent: rankResult.percentileRounded,
    annual: formatCurrency(rankResult.annual.estimate, lang),
  });

  const fmtTop = (percent: number) => formatTemplate(t.topPercentTemplate, { percent });
  const ageLabel = pick(getAgeGroup(input.ageGroup).label, lang);
  const industryLabel = pick(getIndustry(input.industry).label, lang);
  const regionLabel = pick(getRegion(input.region).label, lang);

  const description = [
    `${t.comparisonAge}(${ageLabel}) ${fmtTop(rankResult.groupComparisons.ageGroup)}`,
    `${t.comparisonIndustry}(${industryLabel}) ${fmtTop(rankResult.groupComparisons.industry)}`,
    `${t.comparisonRegion}(${regionLabel}) ${fmtTop(rankResult.groupComparisons.region)}`,
  ].join(" · ");

  return { title, description };
}
