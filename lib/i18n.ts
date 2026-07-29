// Pure i18n data/logic — no React, no "use client". Safe to import from
// client components, server components, and edge routes (e.g. app/api/og)
// alike. The React-facing context/hook lives in lib/LanguageProvider.tsx.

export type LangCode = "ko" | "en";

// Any piece of content that varies by language — used across data/*.ts too.
export type Localized = Record<LangCode, string>;

export function pick(text: Localized, lang: LangCode): string {
  return text[lang] ?? text.ko;
}

// "{key}" 자리표시자를 vars의 값으로 채운다.
export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(String(value)),
    template
  );
}

// 데이터는 항상 만원 단위로 저장돼 있다. 소액(월 소득 등)은 그대로 숫자+단위,
// 자산처럼 억 단위를 넘나드는 큰 금액은 한국어는 "억", 영어는 M/B(KRW) 표기로
// 보여준다 — 원단위 그대로 늘어놓으면 자릿수가 너무 많아 가독성이 떨어진다.
export function formatManwon(manwon: number, lang: LangCode): string {
  const rounded = Math.round(manwon);
  if (lang === "ko") {
    const eok = Math.floor(rounded / 10000);
    const rest = rounded % 10000;
    if (eok > 0) {
      return rest > 0 ? `${eok}억 ${rest.toLocaleString("ko-KR")}만원` : `${eok}억원`;
    }
    return `${rounded.toLocaleString("ko-KR")}만원`;
  }
  const krw = rounded * 10000;
  if (krw >= 100_000_000) return `${(krw / 100_000_000).toFixed(2)}B KRW`;
  if (krw >= 1_000_000) return `${(krw / 1_000_000).toFixed(1)}M KRW`;
  return `${krw.toLocaleString("en-US")} KRW`;
}

// 과거 버전과의 호환 별칭.
export const formatCurrency = formatManwon;

export interface Translations {
  // ── App chrome
  appTitle: string;
  tagline: string;
  disclaimer: string;
  privacyNotice: string;

  // ── Form / step flow
  formStepLabel: string; // template: {step} {total}
  stepGenderTitle: string;
  stepAgeGroupTitle: string;
  stepMaritalTitle: string;
  stepRegionTitle: string;
  stepDistrictTitle: string;
  stepDistrictSkip: string;
  stepCompanySizeTitle: string;
  stepIndustryTitle: string;
  stepSalaryTitle: string;
  stepSalaryHelper: string;
  stepSalaryUnit: string;
  stepNetWorthTitle: string;
  stepNetWorthHelper: string;
  stepNetWorthUnit: string;
  formSubmit: string;
  formBack: string;

  // ── Result screen copy
  resultCardLabel: string;
  shareTitle: string; // template: {percent} {annual}
  incomeSectionTitle: string;
  percentileHeroLabel: string;
  annualEstimateTemplate: string; // template: {value}
  distributionTitle: string;
  distributionYouAreHere: string;
  distributionAverageTick: string;
  distributionLowLabel: string;
  distributionHighLabel: string;
  assetSectionTitle: string;
  netWorthHeroLabel: string;
  netWorthValueTemplate: string; // template: {value}
  netWorthDistributionTitle: string;
  comparisonTitle: string;
  comparisonAge: string;
  comparisonIndustry: string;
  comparisonRegion: string;
  comparisonDistrict: string;
  comparisonMarital: string;
  topPercentTemplate: string; // template: {percent}
  jobVibeTitle: string;
  jobVibeDisclaimer: string;
  jobVibeWlb: string;
  jobVibeGrowth: string;
  jobVibeHip: string;
  adviceTitle: string;
  adviceDisclaimer: string;
  sourceLabel: string;
  sourceText: string;
  netWorthSourceText: string;
  sourceNote: string;

  // ── Nav / actions
  home: string;
  start: string;
  back: string;
  next: string;
  retry: string;
  share: string;
  save: string;
  copied: string;
  shareFailed: string;
  saveFailed: string;
  resultNotFound: string;
  resultNotFoundDesc: string;

  // ── /us section (US Census-based income map) — fully separate from the
  // Korea quiz/result flow above, so keys are prefixed "us" throughout.
  usAppTitle: string;
  usTagline: string;
  usDisclaimer: string;
  usInputTitle: string;
  usFieldGender: string;
  usFieldMarital: string;
  usFieldAgeBand: string;
  usFieldIncome: string;
  usFieldNetWorth: string;
  usFieldNetWorthHelper: string;
  usFieldK401: string;
  usFieldK401Helper: string;
  usApply: string;
  usMapTitle: string;
  usMapHint: string;
  usStateMapTitleTemplate: string; // template: {state}
  usStateMapHint: string;
  usBackToUsMap: string;
  usBackToStateMap: string;
  usCountyNoDataTitle: string;
  usCountyNoDataDesc: string;
  usCountyResultLabel: string;
  usCountyMedianLabel: string;
  usCountyPercentileHeroLabel: string;
  usNationalPercentileHeroLabel: string;
  usNetWorthSectionTitle: string;
  usNetWorthNationalBadge: string;
  usNetWorthHeroLabel: string;
  usK401SectionTitle: string;
  usK401Helper: string;
  usK401VsAverageTemplate: string; // template: {percent}
  usK401VsMedianTemplate: string; // template: {percent}
  usPlaceTitle: string;
  usPlaceComingSoon: string;
  usPlaceBackToCounty: string;
  usSourceCensus: string;
  usSourceScf: string;
  usSourceVanguard: string;
}

export const translations: Record<LangCode, Translations> = {
  ko: {
    appTitle: "💰 내 연봉·자산 상위 몇 %?",
    tagline: "지역·구·결혼상태까지 골라 내 소득과 자산이 어디쯤인지 확인하고, 자산증식 방향까지 받아보세요",
    disclaimer: "통계청 공개 데이터 기반 근사 추정치이며, 개인의 실제 소득·자산과 다를 수 있습니다. 재무 자문이 아닙니다.",
    privacyNotice: "개인정보를 수집하지 않습니다. 모든 계산은 이 브라우저 안에서만 이뤄집니다.",

    formStepLabel: "{step} / {total}",
    stepGenderTitle: "성별을 선택해주세요",
    stepAgeGroupTitle: "연령대를 선택해주세요",
    stepMaritalTitle: "결혼 상태를 선택해주세요",
    stepRegionTitle: "거주 지역(시/도)을 선택해주세요",
    stepDistrictTitle: "서울 내 자치구를 선택해주세요",
    stepDistrictSkip: "구 선택 없이 계속하기",
    stepCompanySizeTitle: "기업 규모를 선택해주세요",
    stepIndustryTitle: "업종을 선택해주세요",
    stepSalaryTitle: "세전 연봉을 입력해주세요",
    stepSalaryHelper: "본인 명의 근로/사업소득 기준, 세전 연 소득을 만원 단위로 입력해주세요.",
    stepSalaryUnit: "만원",
    stepNetWorthTitle: "순자산을 입력해주세요",
    stepNetWorthHelper: "부동산·예적금·투자자산 등 총자산에서 대출 등 부채를 뺀 금액을 만원 단위로 입력해주세요.",
    stepNetWorthUnit: "만원",
    formSubmit: "결과 보기",
    formBack: "이전",

    resultCardLabel: "내 연봉·자산 위치는?",
    shareTitle: "💰 소득 상위 {percent}%! 예상 연봉 약 {annual}",
    incomeSectionTitle: "소득 순위",
    percentileHeroLabel: "당신은 소득 상위",
    annualEstimateTemplate: "입력한 연봉 {value}",
    distributionTitle: "전체 소득 분포에서 내 위치",
    distributionYouAreHere: "너 여기!",
    distributionAverageTick: "평균",
    distributionLowLabel: "소득 낮음",
    distributionHighLabel: "소득 높음",
    assetSectionTitle: "자산 순위",
    netWorthHeroLabel: "당신은 자산 상위",
    netWorthValueTemplate: "입력한 순자산 {value}",
    netWorthDistributionTitle: "전체 자산 분포에서 내 위치",
    comparisonTitle: "여러 각도로 보면",
    comparisonAge: "동일 연령대",
    comparisonIndustry: "동일 직종",
    comparisonRegion: "동일 지역",
    comparisonDistrict: "동일 자치구",
    comparisonMarital: "동일 결혼상태",
    topPercentTemplate: "상위 {percent}%",
    jobVibeTitle: "직업 MZ 지수",
    jobVibeDisclaimer: "재미로 보는 지표예요. 통계 데이터가 아니에요 😉",
    jobVibeWlb: "워라밸",
    jobVibeGrowth: "성장성",
    jobVibeHip: "힙함",
    adviceTitle: "자산증식 제안",
    adviceDisclaimer: "일반적인 재무 정보이며 개인 맞춤 투자자문이 아닙니다. 중요한 결정은 전문가와 상담하세요.",
    sourceLabel: "데이터 출처",
    sourceText: "통계청 2023년 임금근로일자리 소득(보수) 결과 (근사 추정)",
    netWorthSourceText: "가계금융복지조사 공표치 참고 (근사 추정)",
    sourceNote: "위 수치는 공개 통계를 근거로 계산한 추정치예요. 지역·구·결혼상태 배율은 근사 보정값입니다.",

    home: "홈",
    start: "시작하기",
    back: "뒤로",
    next: "다음",
    retry: "다시 하기",
    share: "공유하기",
    save: "이미지 저장",
    copied: "링크 복사됨!",
    shareFailed: "공유 실패",
    saveFailed: "저장 실패. 다시 시도해주세요.",
    resultNotFound: "결과를 찾을 수 없어요",
    resultNotFoundDesc: "다시 시작해서 결과를 확인해보세요.",

    usAppTitle: "🇺🇸 미국 소득 상위 몇 %?",
    usTagline: "성별·결혼상태·연소득·자산을 입력하고 지도에서 주와 카운티를 골라 내 위치를 확인하세요",
    usDisclaimer: "미국 인구조사국(Census Bureau) ACS 5년 추정치 기반이며, 실제 개인 소득·자산과 다를 수 있습니다. 재무 자문이 아닙니다.",
    usInputTitle: "내 정보 입력",
    usFieldGender: "성별",
    usFieldMarital: "결혼상태",
    usFieldAgeBand: "연령대",
    usFieldIncome: "세전 연 소득 (USD)",
    usFieldNetWorth: "순자산 (USD, 401k 제외)",
    usFieldNetWorthHelper: "401k를 제외한 총자산에서 부채를 뺀 금액",
    usFieldK401: "401k 잔액 (USD)",
    usFieldK401Helper: "401k는 순자산과 별도로 입력해주세요",
    usApply: "적용하고 지도 보기",
    usMapTitle: "주(State)를 선택하세요",
    usMapHint: "지도 위에서 주를 클릭하면 카운티별 지도로 이동해요",
    usStateMapTitleTemplate: "{state} 카운티를 선택하세요",
    usStateMapHint: "카운티를 클릭하면 그 카운티 기준 결과를 볼 수 있어요",
    usBackToUsMap: "미국 지도로",
    usBackToStateMap: "주 지도로",
    usCountyNoDataTitle: "이 지역 데이터는 아직 준비 중이에요",
    usCountyNoDataDesc: "scripts/fetchCensusData.ts를 Census API 키와 함께 실행하면 실제 수치로 채워집니다.",
    usCountyResultLabel: "내 소득·자산 위치는?",
    usCountyMedianLabel: "이 카운티 가구 중위소득",
    usCountyPercentileHeroLabel: "이 카운티 기준 소득 상위",
    usNationalPercentileHeroLabel: "미국 전체 기준 소득 상위",
    usNetWorthSectionTitle: "순자산 순위",
    usNetWorthNationalBadge: "🇺🇸 전국 기준",
    usNetWorthHeroLabel: "당신은 미국 전체 자산 상위",
    usK401SectionTitle: "401(k) 비교",
    usK401Helper: "지역별 데이터가 없어 같은 연령대 전국 평균·중앙값과만 비교해요",
    usK401VsAverageTemplate: "같은 연령대 평균 대비 {percent}%",
    usK401VsMedianTemplate: "같은 연령대 중앙값 대비 {percent}%",
    usPlaceTitle: "동네(Place) 상세",
    usPlaceComingSoon: "동네별 상세는 곧 추가돼요. 지금은 카운티 단위 결과를 참고해주세요.",
    usPlaceBackToCounty: "카운티 결과로 돌아가기",
    usSourceCensus: "US Census Bureau, ACS 2022 5-Year Estimates (B19013, B19001)",
    usSourceScf: "Federal Reserve, 2022 Survey of Consumer Finances",
    usSourceVanguard: "Vanguard, How America Saves 2026",
  },
  en: {
    appTitle: "💰 My Income & Net Worth Percentile",
    tagline: "Pick your region, district, and marital status to see where your income and assets rank — and how to grow them",
    disclaimer: "An approximate estimate based on public Statistics Korea data — actual figures may differ. Not financial advice.",
    privacyNotice: "We don't collect personal data. Every calculation runs right in your browser.",

    formStepLabel: "{step} / {total}",
    stepGenderTitle: "Select your gender",
    stepAgeGroupTitle: "Select your age group",
    stepMaritalTitle: "Select your marital status",
    stepRegionTitle: "Select your region (province/city)",
    stepDistrictTitle: "Select your district within Seoul",
    stepDistrictSkip: "Continue without a district",
    stepCompanySizeTitle: "Select your company size",
    stepIndustryTitle: "Select your industry",
    stepSalaryTitle: "Enter your pre-tax annual salary",
    stepSalaryHelper: "Enter your own pre-tax annual income (wages or business income) in 10K KRW units.",
    stepSalaryUnit: "10K KRW",
    stepNetWorthTitle: "Enter your net worth",
    stepNetWorthHelper: "Total assets (real estate, savings, investments, etc.) minus debt, in 10K KRW units.",
    stepNetWorthUnit: "10K KRW",
    formSubmit: "See my result",
    formBack: "Back",

    resultCardLabel: "Where do my income & assets rank?",
    shareTitle: "💰 Top {percent}% by income! Annual salary ~{annual}",
    incomeSectionTitle: "Income rank",
    percentileHeroLabel: "You're in the top",
    annualEstimateTemplate: "Entered salary {value}",
    distributionTitle: "Where you stand in the income distribution",
    distributionYouAreHere: "You're here!",
    distributionAverageTick: "avg",
    distributionLowLabel: "Lower income",
    distributionHighLabel: "Higher income",
    assetSectionTitle: "Net worth rank",
    netWorthHeroLabel: "You're in the top",
    netWorthValueTemplate: "Entered net worth {value}",
    netWorthDistributionTitle: "Where you stand in the net worth distribution",
    comparisonTitle: "From different angles",
    comparisonAge: "Same age group",
    comparisonIndustry: "Same industry",
    comparisonRegion: "Same region",
    comparisonDistrict: "Same district",
    comparisonMarital: "Same marital status",
    topPercentTemplate: "Top {percent}%",
    jobVibeTitle: "Job Vibe Index",
    jobVibeDisclaimer: "Just for fun — not based on statistics 😉",
    jobVibeWlb: "Work-life",
    jobVibeGrowth: "Growth",
    jobVibeHip: "Hipness",
    adviceTitle: "Ways to grow your assets",
    adviceDisclaimer: "General financial information only, not personalized investment advice. Consult a professional for important decisions.",
    sourceLabel: "Data source",
    sourceText: "Statistics Korea, 2023 Wage & Salary Job Income Report (approximate)",
    netWorthSourceText: "Based on the Survey of Household Finances and Living Conditions (approximate)",
    sourceNote: "Figures are estimates from public statistics. Region/district/marital-status multipliers are rough approximations.",

    home: "Home",
    start: "Start",
    back: "Back",
    next: "Next",
    retry: "Try Again",
    share: "Share",
    save: "Save Image",
    copied: "Link copied!",
    shareFailed: "Share failed",
    saveFailed: "Save failed. Please try again.",
    resultNotFound: "Result not found",
    resultNotFoundDesc: "Start over to get your result.",

    usAppTitle: "🇺🇸 US Income Percentile",
    usTagline: "Enter your gender, marital status, income, and assets, then pick a state and county on the map to see where you rank",
    usDisclaimer: "Based on US Census Bureau ACS 5-Year Estimates — actual figures may differ from your real income/assets. Not financial advice.",
    usInputTitle: "Your info",
    usFieldGender: "Gender",
    usFieldMarital: "Marital status",
    usFieldAgeBand: "Age band",
    usFieldIncome: "Pre-tax annual income (USD)",
    usFieldNetWorth: "Net worth (USD, excluding 401k)",
    usFieldNetWorthHelper: "Total assets minus debt, not counting your 401k",
    usFieldK401: "401k balance (USD)",
    usFieldK401Helper: "Enter this separately from net worth",
    usApply: "Apply & view map",
    usMapTitle: "Select a state",
    usMapHint: "Click a state on the map to see its county-level map",
    usStateMapTitleTemplate: "Select a county in {state}",
    usStateMapHint: "Click a county to see your result for that county",
    usBackToUsMap: "US map",
    usBackToStateMap: "State map",
    usCountyNoDataTitle: "Data for this area isn't loaded yet",
    usCountyNoDataDesc: "Run scripts/fetchCensusData.ts with a Census API key to populate real figures.",
    usCountyResultLabel: "Where do you rank?",
    usCountyMedianLabel: "This county's median household income",
    usCountyPercentileHeroLabel: "Top in this county",
    usNationalPercentileHeroLabel: "Top nationwide",
    usNetWorthSectionTitle: "Net worth rank",
    usNetWorthNationalBadge: "🇺🇸 Nationwide only",
    usNetWorthHeroLabel: "You're in the nationwide top",
    usK401SectionTitle: "401(k) comparison",
    usK401Helper: "No regional data exists, so this only compares against the nationwide average/median for your age band",
    usK401VsAverageTemplate: "{percent}% of same-age average",
    usK401VsMedianTemplate: "{percent}% of same-age median",
    usPlaceTitle: "Place detail",
    usPlaceComingSoon: "Place (town/city)-level detail is coming soon. For now, use the county-level result.",
    usPlaceBackToCounty: "Back to county result",
    usSourceCensus: "US Census Bureau, ACS 2022 5-Year Estimates (B19013, B19001)",
    usSourceScf: "Federal Reserve, 2022 Survey of Consumer Finances",
    usSourceVanguard: "Vanguard, How America Saves 2026",
  },
};

// ── Language metadata ────────────────────────────────────────────────────────
export interface LangMeta {
  code: LangCode;
  label: string;
  dir: "ltr" | "rtl";
}

export const LANGUAGES: LangMeta[] = [
  { code: "ko", label: "한국어", dir: "ltr" },
  { code: "en", label: "English", dir: "ltr" },
];

export const DEFAULT_LANG: LangCode = "ko";

export const SOURCE_URL =
  "https://kostat.go.kr/board.es?act=view&bid=11113&list_no=435195&mid=a10301010000";

export const NETWORTH_SOURCE_URL =
  "https://kostat.go.kr/board.es?act=view&bid=11109&mid=a10301010000";

export function detectBrowserLang(): LangCode {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  return navigator.language.slice(0, 2).toLowerCase() === "ko" ? "ko" : "en";
}

export function isLangCode(value: unknown): value is LangCode {
  return value === "ko" || value === "en";
}
