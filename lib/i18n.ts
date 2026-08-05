// Pure i18n data/logic — no React, no "use client". Safe to import from
// client components, server components, and edge routes alike. The
// React-facing context/hook lives in lib/LanguageProvider.tsx.

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

export interface Translations {
  // ── App chrome
  privacyNotice: string;

  // ── Distribution chart (components/DistributionChart.tsx)
  distributionYouAreHere: string;
  distributionAverageTick: string;
  distributionLowLabel: string;
  distributionHighLabel: string;
  topPercentTemplate: string; // template: {percent}

  // ── Nav / actions
  home: string;
  share: string;
  save: string;
  copied: string;
  shareFailed: string;
  saveFailed: string;
  usDismiss: string;

  // ── "Compare with a friend" challenge links (see lib/usInput.ts)
  usCompareButton: string;
  usFriendBannerTemplate: string; // template: {percent}, {place}
  usCompareCardTitle: string;
  usCompareCardYou: string;
  usCompareCardFriend: string;

  // ── Share card footer (components/us/UsResultCard.tsx)
  usShareCardSource: string;

  // ── /us section (US Census-based income map)
  usAppTitle: string;
  usTagline: string;
  usDisclaimer: string;
  usInputTitle: string;
  usGroupWho: string;
  usGroupMoney: string;
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
  usLegendNoData: string;
  usStateMapTitleTemplate: string; // template: {state}
  usStateMapHint: string;
  usSearchStatePlaceholder: string;
  usSearchCountyPlaceholder: string;
  usListNoResults: string;
  usViewMap: string;
  usViewList: string;
  usZoomHint: string;
  usBackToUsMap: string;
  usBackToStateMap: string;
  usCountyNoDataTitle: string;
  usCountyNoDataDesc: string;
  usCountyResultLabel: string;
  usCountyMedianLabel: string;
  usStateMedianLabel: string;
  usAcs1YearLabel: string; // template: {year}
  usAcs5YearLabel: string; // template: {range}
  usCountyPercentileHeroLabel: string;
  usNationalPercentileHeroLabel: string;
  usAgeIncomePercentileHeroLabel: string; // template: {age}
  usNetWorthSectionTitle: string;
  usNetWorthNationalBadge: string;
  usNetWorthHeroLabel: string;
  usAgeNetWorthPercentileHeroLabel: string; // template: {age}
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
    privacyNotice: "개인정보를 수집하지 않습니다. 모든 계산은 이 브라우저 안에서만 이뤄집니다.",

    distributionYouAreHere: "너 여기!",
    distributionAverageTick: "평균",
    distributionLowLabel: "소득 낮음",
    distributionHighLabel: "소득 높음",
    topPercentTemplate: "상위 {percent}%",

    home: "홈",
    share: "공유하기",
    save: "이미지 저장",
    copied: "링크 복사됨!",
    shareFailed: "공유 실패",
    saveFailed: "저장 실패. 다시 시도해주세요.",
    usDismiss: "닫기",

    usCompareButton: "친구와 비교하기",
    usFriendBannerTemplate: "친구가 {place} 주민의 {percent}%보다 소득이 높아요 — 내 정보를 입력하고 비교해보세요.",
    usCompareCardTitle: "당신 vs. 친구",
    usCompareCardYou: "당신",
    usCompareCardFriend: "친구",

    usShareCardSource: "출처: 미국 인구조사국 ACS 5년 추정치",

    usAppTitle: "미국 소득 상위 몇 %?",
    usTagline: "성별·결혼상태·연소득·자산을 입력하고 지도에서 주와 카운티를 골라 내 위치를 확인하세요",
    usDisclaimer: "미국 인구조사국(Census Bureau) ACS 5년 추정치 기반이며, 실제 개인 소득·자산과 다를 수 있습니다. 재무 자문이 아닙니다.",
    usInputTitle: "내 정보 입력",
    usGroupWho: "당신은?",
    usGroupMoney: "당신의 돈",
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
    usLegendNoData: "데이터 없음",
    usStateMapTitleTemplate: "{state} 카운티를 선택하세요",
    usStateMapHint: "카운티를 클릭하면 그 카운티 기준 결과를 볼 수 있어요",
    usSearchStatePlaceholder: "주 이름 검색...",
    usSearchCountyPlaceholder: "카운티 이름 검색...",
    usListNoResults: "검색 결과가 없어요",
    usViewMap: "🗺️ 지도로 보기",
    usViewList: "📋 목록으로 보기",
    usZoomHint: "손가락으로 확대·이동하거나 더블탭으로 확대/축소하세요",
    usBackToUsMap: "미국 지도로",
    usBackToStateMap: "주 지도로",
    usCountyNoDataTitle: "이 지역 데이터는 아직 준비 중이에요",
    usCountyNoDataDesc: "scripts/fetchCensusData.ts를 Census API 키와 함께 실행하면 실제 수치로 채워집니다.",
    usCountyResultLabel: "내 소득·자산 위치는?",
    usCountyMedianLabel: "이 카운티 가구 중위소득",
    usStateMedianLabel: "이 주 가구 중위소득",
    usAcs1YearLabel: "최신 연간 추정치 (1-Year, {year})",
    usAcs5YearLabel: "5개년 평균 (5-Year, {range})",
    usCountyPercentileHeroLabel: "이 카운티 기준 소득 상위",
    usNationalPercentileHeroLabel: "미국 전체 기준 소득 상위",
    usAgeIncomePercentileHeroLabel: "전국 동일 연령대({age}) 기준 소득 상위",
    usNetWorthSectionTitle: "순자산 순위",
    usNetWorthNationalBadge: "🇺🇸 전국 기준",
    usNetWorthHeroLabel: "당신은 미국 전체 자산 상위",
    usAgeNetWorthPercentileHeroLabel: "전국 동일 연령대({age}) 기준 자산 상위",
    usK401SectionTitle: "401(k) 비교",
    usK401Helper: "지역별 데이터가 없어 같은 연령대 전국 평균·중앙값과만 비교해요",
    usK401VsAverageTemplate: "같은 연령대 평균 대비 {percent}%",
    usK401VsMedianTemplate: "같은 연령대 중앙값 대비 {percent}%",
    usPlaceTitle: "동네(Place) 상세",
    usPlaceComingSoon: "동네별 상세는 곧 추가돼요. 지금은 카운티 단위 결과를 참고해주세요.",
    usPlaceBackToCounty: "카운티 결과로 돌아가기",
    usSourceCensus: "US Census Bureau, ACS {range} 5-Year Estimates (B19013, B19001)",
    usSourceScf: "Federal Reserve, 2022 Survey of Consumer Finances",
    usSourceVanguard: "Vanguard, How America Saves 2026",
  },
  en: {
    privacyNotice: "We don't collect personal data. Every calculation runs right in your browser.",

    distributionYouAreHere: "You're here!",
    distributionAverageTick: "avg",
    distributionLowLabel: "Lower income",
    distributionHighLabel: "Higher income",
    topPercentTemplate: "Top {percent}%",

    home: "Home",
    share: "Share",
    save: "Save Image",
    copied: "Link copied!",
    shareFailed: "Share failed",
    saveFailed: "Save failed. Please try again.",
    usDismiss: "Dismiss",

    usCompareButton: "Compare with a friend",
    usFriendBannerTemplate: "A friend out-earns {percent}% of people in {place} — enter your info to see how you compare.",
    usCompareCardTitle: "You vs. your friend",
    usCompareCardYou: "You",
    usCompareCardFriend: "Your friend",

    usShareCardSource: "Source: US Census Bureau ACS 5-Year Estimates",

    usAppTitle: "US Income Percentile",
    usTagline: "Enter your gender, marital status, income, and assets, then pick a state and county on the map to see where you rank",
    usDisclaimer: "Based on US Census Bureau ACS 5-Year Estimates — actual figures may differ from your real income/assets. Not financial advice.",
    usInputTitle: "Your info",
    usGroupWho: "Who are you?",
    usGroupMoney: "Your money",
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
    usLegendNoData: "No data",
    usStateMapTitleTemplate: "Select a county in {state}",
    usStateMapHint: "Click a county to see your result for that county",
    usSearchStatePlaceholder: "Search states...",
    usSearchCountyPlaceholder: "Search counties...",
    usListNoResults: "No results found",
    usViewMap: "🗺️ View map",
    usViewList: "📋 View list",
    usZoomHint: "Pinch or drag to pan/zoom, double-tap to toggle zoom",
    usBackToUsMap: "US map",
    usBackToStateMap: "State map",
    usCountyNoDataTitle: "Data for this area isn't loaded yet",
    usCountyNoDataDesc: "Run scripts/fetchCensusData.ts with a Census API key to populate real figures.",
    usCountyResultLabel: "Where do you rank?",
    usCountyMedianLabel: "This county's median household income",
    usStateMedianLabel: "This state's median household income",
    usAcs1YearLabel: "Latest annual estimate (1-Year, {year})",
    usAcs5YearLabel: "5-Year average (5-Year, {range})",
    usCountyPercentileHeroLabel: "Top in this county",
    usNationalPercentileHeroLabel: "Top nationwide",
    usAgeIncomePercentileHeroLabel: "Top nationwide for your age ({age})",
    usNetWorthSectionTitle: "Net worth rank",
    usNetWorthNationalBadge: "🇺🇸 Nationwide only",
    usNetWorthHeroLabel: "You're in the nationwide top",
    usAgeNetWorthPercentileHeroLabel: "Top nationwide for your age ({age})",
    usK401SectionTitle: "401(k) comparison",
    usK401Helper: "No regional data exists, so this only compares against the nationwide average/median for your age band",
    usK401VsAverageTemplate: "{percent}% of same-age average",
    usK401VsMedianTemplate: "{percent}% of same-age median",
    usPlaceTitle: "Place detail",
    usPlaceComingSoon: "Place (town/city)-level detail is coming soon. For now, use the county-level result.",
    usPlaceBackToCounty: "Back to county result",
    usSourceCensus: "US Census Bureau, ACS {range} 5-Year Estimates (B19013, B19001)",
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

export function detectBrowserLang(): LangCode {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  return navigator.language.slice(0, 2).toLowerCase() === "ko" ? "ko" : "en";
}

export function isLangCode(value: unknown): value is LangCode {
  return value === "ko" || value === "en";
}
