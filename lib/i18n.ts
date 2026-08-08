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
  saveStory: string;
  copied: string;
  shareFailed: string;
  saveFailed: string;
  usDismiss: string;

  // ── Footer (components/us/Footer.tsx)
  footerAbout: string;
  footerPrivacy: string;
  footerContact: string;
  footerBackHome: string;

  // ── "Compare with a friend" challenge links (see lib/usInput.ts)
  usCompareButton: string;
  usCompareCopiedShort: string;
  usCompareCopyFailedHelper: string;
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
  usFieldOptionalPlaceholder: string;
  usFieldAssetsSectionTitle: string;
  usSeeNationalResultButtonTemplate: string; // template: {income}
  usApply: string;
  usMapTitle: string;
  usMapHint: string;
  usLegendNoData: string;
  usStateMapTitleTemplate: string; // template: {state}
  usStateMapHint: string;
  usSearchStatePlaceholder: string;
  usSearchCountyPlaceholder: string;
  usSearchPlacePlaceholder: string;
  usListNoResults: string;
  usViewMap: string;
  usViewList: string;
  usZoomHint: string;
  usBackToUsMap: string;
  usBackToStateMap: string;
  usCountyNoDataTitle: string;
  usCountyNoDataDesc: string;
  usCountyResultLabel: string;
  usSeeFullBreakdown: string;
  usCountyMedianLabel: string;
  usByGenderMedianLabelTemplate: string; // template: {gender}
  usByMaritalMedianLabelTemplate: string; // template: {status}
  usRegionalDetailFallbackNote: string;
  usStateMedianLabel: string;
  usNationalMedianLabel: string;
  usAcs1YearLabel: string; // template: {year}
  usAcs5YearLabel: string; // template: {range}
  usCountyPercentileHeroLabel: string;
  usHeadlineCountyLabelTemplate: string; // template: {county} — the summary card's dynamic label, e.g. "Top in Lee County"
  usNationalPercentileHeroLabel: string;
  usAgeIncomePercentileHeroLabel: string; // template: {age}
  usNetWorthSectionTitle: string;
  usNetWorthNationalBadge: string;
  usNetWorthHeroLabel: string;
  usAgeNetWorthPercentileHeroLabel: string; // template: {age}
  usNetWorthMissingTitle: string;
  usNetWorthMissingDesc: string;
  usK401SectionTitle: string;
  usK401Helper: string;
  usK401VsAverageTemplate: string; // template: {percent}
  usK401VsMedianTemplate: string; // template: {percent}
  usK401MissingTitle: string;
  usK401MissingDesc: string;
  usShareTextTemplate: string; // template: {percent} — ShareButtons' shareText, national percentile
  usPlaceBackToCounty: string;
  usSourceCensus: string;
  usSourceScf: string;
  usSourceVanguard: string;

  // ── State SEO landing content (app/us/[state]/UsStateClient.tsx)
  usStateIncomeIntroTemplate: string; // template: {state}, {median}, {percent}
  usStateThresholdsHeadingTemplate: string; // template: {state}
  usStateCountyListHeadingTemplate: string; // template: {state}
  usStateCountyListHint: string;

  // ── County SEO landing page (app/us/[state]/[county]/page.tsx)
  usCountyPageHeadingTemplate: string; // template: {county}
  usCountyMetaDescriptionTemplate: string; // template: {county}, {median}
  usCountyVsStateTemplate: string; // template: {percent}, {state}
  usCountyVsNationalTemplate: string; // template: {percent}
  usCountyThresholdsHeading: string;
  usCountyNearbyHeading: string;
  usCountyCtaHeadingTemplate: string; // template: {county}
  usCountyCtaBody: string;
  usCountyCtaButton: string;
  usCountyPlaceListHeadingTemplate: string; // template: {county}
  usCountyPlaceListHint: string;
  usCountyMapPickHint: string;
  usCountyViewResultsForPlaceTemplate: string; // template: {place}

  // ── Place SEO landing page (app/us/[state]/[county]/[place]/page.tsx)
  usPlacePageHeadingTemplate: string; // template: {place}
  usPlaceMetaDescriptionTemplate: string; // template: {place}, {median}
  usPlaceVsCountyTemplate: string; // template: {percent}, {county}
  usPlaceVsStateTemplate: string; // template: {percent}, {state}
  usPlaceVsNationalTemplate: string; // template: {percent}
  usPlaceMedianLabel: string;
  usPlaceCtaHeadingTemplate: string; // template: {place}
  usPlaceOtherCitiesHeading: string;

  // ── Unified result dashboard (app/us/result/DashboardResultClient.tsx)
  usStatePercentileHeroLabel: string;
  usPlacePercentileHeroLabel: string;
  usResultDashboardIntro: string;
  usResultMissingLocationTitle: string;
  usResultMissingLocationDesc: string;
  usResultMissingLocationCta: string;
  usDashboardIncomeSectionTitle: string;
  usDashboardCompareChartTitle: string;
  usDashboardIncomeLabel: string;
  usDashboardPlaceIncomeLabel: string;
  usDashboardStateIncomeLabel: string;
  usDashboardCountyIncomeLabel: string;
  usDashboardNationalIncomeLabel: string;
  usDashboardAgeIncomeLabelTemplate: string; // template: {age}
  usDashboardNetWorthLabel: string;
  usDashboardAgeNetWorthLabelTemplate: string; // template: {age}
  usDashboardHeadlineComboTemplate: string; // template: {baseLabel}, {basePercent}, {bestLabel}, {bestPercent}
  usDashboardHeadlineSingleTemplate: string; // template: {bestLabel}, {bestPercent}
  usDashboardSharePromptTitle: string;
  usDashboardSharePromptDesc: string;
  usDashboardPlaceSectionHeading: string;
  usDashboardPlaceSectionHint: string;
  usDashboardPlaceSelectedLabel: string;
  usCityPickerAriaLabel: string;
  usDetailsToggleShow: string;
  usDetailsToggleHide: string;
  usDashboardAddMoreHint: string;

  // ── Insights (app/us/insights/**)
  footerInsights: string;
  usInsightsTitle: string;
  usInsightsIntro: string;
  usInsightsEmpty: string;
  usInsightsBackToList: string;
  usInsightsCtaTitle: string;
  usInsightsCtaBody: string;
  usInsightsCtaButton: string;
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
    saveStory: "스토리 저장",
    copied: "링크 복사됨!",
    shareFailed: "공유 실패",
    saveFailed: "저장 실패. 다시 시도해주세요.",
    usDismiss: "닫기",

    footerAbout: "사이트 소개",
    footerPrivacy: "개인정보처리방침",
    footerContact: "문의하기",
    footerBackHome: "홈으로",

    usCompareButton: "친구와 비교하기",
    usCompareCopiedShort: "복사됨!",
    usCompareCopyFailedHelper: "자동 복사에 실패했어요 — 아래 링크를 직접 복사해주세요.",
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
    usFieldOptionalPlaceholder: "선택 입력",
    usFieldAssetsSectionTitle: "당신의 자산",
    usSeeNationalResultButtonTemplate: "{income}가 전국에서 상위 몇 %인지 보기",
    usApply: "적용하고 지도 보기",
    usMapTitle: "주(State)를 선택하세요",
    usMapHint: "지도 위에서 주를 클릭하면 카운티별 지도로 이동해요",
    usLegendNoData: "데이터 없음",
    usStateMapTitleTemplate: "{state} 카운티를 선택하세요",
    usStateMapHint: "카운티를 클릭하면 그 카운티 기준 결과를 볼 수 있어요",
    usSearchStatePlaceholder: "주 이름 검색...",
    usSearchCountyPlaceholder: "카운티 이름 검색...",
    usSearchPlacePlaceholder: "도시 이름 검색...",
    usListNoResults: "검색 결과가 없어요",
    usViewMap: "🗺️ 지도로 보기",
    usViewList: "📋 목록으로 보기",
    usZoomHint: "손가락으로 확대·이동하거나 더블탭으로 확대/축소하세요",
    usBackToUsMap: "미국 지도로",
    usBackToStateMap: "주 지도로",
    usCountyNoDataTitle: "이 지역 데이터는 아직 준비 중이에요",
    usCountyNoDataDesc: "scripts/fetchCensusData.ts를 Census API 키와 함께 실행하면 실제 수치로 채워집니다.",
    usCountyResultLabel: "내 소득·자산 위치는?",
    usSeeFullBreakdown: "전체 내역 보기",
    usCountyMedianLabel: "이 카운티 가구 중위소득",
    usByGenderMedianLabelTemplate: "{gender} 개인소득 중앙값 (이 카운티)",
    usByMaritalMedianLabelTemplate: "{status} 가구소득 중앙값 (이 카운티)",
    usRegionalDetailFallbackNote: "이 지역은 세부 데이터가 없어 전체 평균을 사용했어요.",
    usStateMedianLabel: "이 주 가구 중위소득",
    usNationalMedianLabel: "전국 가구 중위소득",
    usAcs1YearLabel: "최신 연간 추정치 (1-Year, {year})",
    usAcs5YearLabel: "5개년 평균 (5-Year, {range})",
    usCountyPercentileHeroLabel: "이 카운티 기준 소득 상위",
    usHeadlineCountyLabelTemplate: "{county} 기준 소득 상위",
    usNationalPercentileHeroLabel: "미국 전체 기준 소득 상위",
    usAgeIncomePercentileHeroLabel: "전국 동일 연령대({age}) 기준 소득 상위",
    usNetWorthMissingTitle: "순자산을 입력하면 확인할 수 있어요",
    usNetWorthMissingDesc: "위쪽 '당신의 자산'에 입력해주세요 — 10초면 돼요.",
    usK401MissingTitle: "401(k) 잔액을 입력하면 확인할 수 있어요",
    usK401MissingDesc: "위쪽 '당신의 자산'에 입력해주세요 — 10초면 돼요.",
    usShareTextTemplate: "나는 미국 소득 상위 {percent}%. 당신은?",
    usNetWorthSectionTitle: "순자산 순위",
    usNetWorthNationalBadge: "🇺🇸 전국 기준",
    usNetWorthHeroLabel: "당신은 미국 전체 자산 상위",
    usAgeNetWorthPercentileHeroLabel: "전국 동일 연령대({age}) 기준 자산 상위",
    usK401SectionTitle: "401(k) 비교",
    usK401Helper: "지역별 데이터가 없어 같은 연령대 전국 평균·중앙값과만 비교해요",
    usK401VsAverageTemplate: "같은 연령대 평균 대비 {percent}%",
    usK401VsMedianTemplate: "같은 연령대 중앙값 대비 {percent}%",
    usPlaceBackToCounty: "카운티 페이지로",
    usSourceCensus: "US Census Bureau, ACS {range} 5-Year Estimates (B19013, B19001)",
    usSourceScf: "Federal Reserve, 2022 Survey of Consumer Finances",
    usSourceVanguard: "Vanguard, How America Saves 2026",

    usStateIncomeIntroTemplate: "{state}의 가구 중위소득은 {median}으로, 전국 기준 상위 {percent}%에 해당해요.",
    usStateThresholdsHeadingTemplate: "{state} 소득 상위 기준선",
    usStateCountyListHeadingTemplate: "{state}의 카운티",
    usStateCountyListHint: "카운티별 가구 중위소득이에요. 카운티를 누르면 자세한 내용을 볼 수 있어요.",

    usCountyPageHeadingTemplate: "{county} 소득은 상위 몇 %?",
    usCountyMetaDescriptionTemplate: "{county}의 가구 중위소득은 {median}이에요. 상위 1%·5%·10%·25% 소득 기준선과 함께 내 소득이 어디쯤인지 확인해보세요.",
    usCountyVsStateTemplate: "{state} 기준으로는 상위 {percent}%에 해당해요.",
    usCountyVsNationalTemplate: "전국 기준으로는 상위 {percent}%예요.",
    usCountyThresholdsHeading: "이 카운티의 소득 기준선",
    usCountyNearbyHeading: "인접 카운티",
    usCountyCtaHeadingTemplate: "{county}에서 내 순위를 정확히 확인해보세요",
    usCountyCtaBody: "소득·성별·결혼상태·연령대를 입력하면 30초 안에 확인할 수 있어요.",
    usCountyCtaButton: "내 순위 계산하기",
    usCountyPlaceListHeadingTemplate: "{county}의 도시",
    usCountyPlaceListHint: "도시별 가구 중위소득이에요. 도시를 누르면 대시보드에 도시 기준 순위까지 함께 나와요.",
    usCountyMapPickHint: "목록에서 도시를 고르면 지도에 위치가 표시돼요.",
    usCountyViewResultsForPlaceTemplate: "{place} 결과 보기",

    usPlacePageHeadingTemplate: "{place} 소득은 상위 몇 %?",
    usPlaceMetaDescriptionTemplate: "{place}의 가구 중위소득은 {median}이에요. 카운티·주·전국 기준으로 내 소득이 어디쯤인지 확인해보세요.",
    usPlaceVsCountyTemplate: "{county} 기준으로는 상위 {percent}%에 해당해요.",
    usPlaceVsStateTemplate: "{state} 기준으로는 상위 {percent}%에 해당해요.",
    usPlaceVsNationalTemplate: "전국 기준으로는 상위 {percent}%예요.",
    usPlaceMedianLabel: "이 도시 가구 중위소득",
    usPlaceCtaHeadingTemplate: "{place}에서 내 순위를 정확히 확인해보세요",
    usPlaceOtherCitiesHeading: "이 카운티의 다른 도시",

    usStatePercentileHeroLabel: "이 주 기준 소득 상위",
    usPlacePercentileHeroLabel: "이 도시 기준 소득 상위",
    usResultDashboardIntro: "미국 전체, 내가 사는 주·카운티, 동일 연령대, 그리고 순자산·401(k)까지 — 모든 순위를 한 화면에서 확인하세요.",
    usResultMissingLocationTitle: "먼저 지도에서 지역을 선택해주세요",
    usResultMissingLocationDesc: "결과를 보려면 주(State)와 카운티(County)를 먼저 선택해야 해요.",
    usResultMissingLocationCta: "지도에서 선택하기",
    usDashboardIncomeSectionTitle: "소득 순위",
    usDashboardCompareChartTitle: "한눈에 비교하기",
    usDashboardIncomeLabel: "소득",
    usDashboardPlaceIncomeLabel: "도시 소득",
    usDashboardStateIncomeLabel: "주 소득",
    usDashboardCountyIncomeLabel: "카운티 소득",
    usDashboardNationalIncomeLabel: "전국 소득",
    usDashboardAgeIncomeLabelTemplate: "{age} 소득",
    usDashboardNetWorthLabel: "순자산",
    usDashboardAgeNetWorthLabelTemplate: "{age} 순자산",
    usDashboardHeadlineComboTemplate: "{baseLabel} 기준으로는 상위 {basePercent}%지만, {bestLabel} 기준으로는 상위 {bestPercent}%까지 올라가요!",
    usDashboardHeadlineSingleTemplate: "{bestLabel} 기준으로 상위 {bestPercent}%예요!",
    usDashboardSharePromptTitle: "공유 카드는 지역을 선택하면 만들어져요",
    usDashboardSharePromptDesc: "지도에서 주(State)와 카운티(County)를 선택하면 공유용 카드와 친구 비교 기능을 쓸 수 있어요.",
    usDashboardPlaceSectionHeading: "도시 선택 (선택사항)",
    usDashboardPlaceSectionHint: "카운티 안의 도시를 고르면 도시 기준 순위도 대시보드에 추가돼요.",
    usDashboardPlaceSelectedLabel: "선택한 도시",
    usCityPickerAriaLabel: "도시 선택",
    usDetailsToggleShow: "분포도 자세히 보기",
    usDetailsToggleHide: "분포도 접기",
    usDashboardAddMoreHint: "순자산·401(k)을 입력하면 더 많은 순위가 추가돼요.",

    footerInsights: "인사이트",
    usInsightsTitle: "인사이트",
    usInsightsIntro: "소득 백분위, 지역별 데이터, 통계가 실제로 의미하는 것들에 대한 짧은 글 모음이에요.",
    usInsightsEmpty: "곧 글이 올라올 예정이에요.",
    usInsightsBackToList: "인사이트 목록",
    usInsightsCtaTitle: "내 소득은 상위 몇 %일까요?",
    usInsightsCtaBody: "성별·결혼상태·연소득을 입력하고 지도에서 지역을 고르면 30초 안에 확인할 수 있어요.",
    usInsightsCtaButton: "지금 확인하기",
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
    saveStory: "Save Story",
    copied: "Link copied!",
    shareFailed: "Share failed",
    saveFailed: "Save failed. Please try again.",
    usDismiss: "Dismiss",

    footerAbout: "About",
    footerPrivacy: "Privacy Policy",
    footerContact: "Contact",
    footerBackHome: "Back home",

    usCompareButton: "Compare with a friend",
    usCompareCopiedShort: "Copied!",
    usCompareCopyFailedHelper: "Couldn't copy automatically — copy the link below:",
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
    usFieldOptionalPlaceholder: "Optional",
    usFieldAssetsSectionTitle: "Your Assets",
    usSeeNationalResultButtonTemplate: "See where {income} ranks nationwide",
    usApply: "Apply & view map",
    usMapTitle: "Select a state",
    usMapHint: "Click a state on the map to see its county-level map",
    usLegendNoData: "No data",
    usStateMapTitleTemplate: "Select a county in {state}",
    usStateMapHint: "Click a county to see your result for that county",
    usSearchStatePlaceholder: "Search states...",
    usSearchCountyPlaceholder: "Search counties...",
    usSearchPlacePlaceholder: "Search cities...",
    usListNoResults: "No results found",
    usViewMap: "🗺️ View map",
    usViewList: "📋 View list",
    usZoomHint: "Pinch or drag to pan/zoom, double-tap to toggle zoom",
    usBackToUsMap: "US map",
    usBackToStateMap: "State map",
    usCountyNoDataTitle: "Data for this area isn't loaded yet",
    usCountyNoDataDesc: "Run scripts/fetchCensusData.ts with a Census API key to populate real figures.",
    usCountyResultLabel: "Where do you rank?",
    usSeeFullBreakdown: "See full breakdown",
    usCountyMedianLabel: "This county's median household income",
    usByGenderMedianLabelTemplate: "{gender} median earnings (this county)",
    usByMaritalMedianLabelTemplate: "{status} household median income (this county)",
    usRegionalDetailFallbackNote: "This area has no detailed data — using the overall average.",
    usStateMedianLabel: "This state's median household income",
    usNationalMedianLabel: "Nationwide median household income",
    usAcs1YearLabel: "Latest annual estimate (1-Year, {year})",
    usAcs5YearLabel: "5-Year average (5-Year, {range})",
    usCountyPercentileHeroLabel: "Top in this county",
    usHeadlineCountyLabelTemplate: "Top in {county}",
    usNationalPercentileHeroLabel: "Top nationwide",
    usAgeIncomePercentileHeroLabel: "Top nationwide for your age ({age})",
    usNetWorthMissingTitle: "Add your net worth to see this",
    usNetWorthMissingDesc: "Fill it in under \"Your Assets\" above — takes 10 seconds.",
    usK401MissingTitle: "Add your 401(k) balance to see this",
    usK401MissingDesc: "Fill it in under \"Your Assets\" above — takes 10 seconds.",
    usShareTextTemplate: "I'm in the top {percent}% of US earners. Where do you rank?",
    usNetWorthSectionTitle: "Net worth rank",
    usNetWorthNationalBadge: "🇺🇸 Nationwide only",
    usNetWorthHeroLabel: "You're in the nationwide top",
    usAgeNetWorthPercentileHeroLabel: "Top nationwide for your age ({age})",
    usK401SectionTitle: "401(k) comparison",
    usK401Helper: "No regional data exists, so this only compares against the nationwide average/median for your age band",
    usK401VsAverageTemplate: "{percent}% of same-age average",
    usK401VsMedianTemplate: "{percent}% of same-age median",
    usPlaceBackToCounty: "Back to county page",
    usSourceCensus: "US Census Bureau, ACS {range} 5-Year Estimates (B19013, B19001)",
    usSourceScf: "Federal Reserve, 2022 Survey of Consumer Finances",
    usSourceVanguard: "Vanguard, How America Saves 2026",

    usStateIncomeIntroTemplate: "The median household income in {state} is {median}, which ranks in the top {percent}% nationally.",
    usStateThresholdsHeadingTemplate: "Top income thresholds in {state}",
    usStateCountyListHeadingTemplate: "Counties in {state}",
    usStateCountyListHint: "Median household income by county. Tap a county to see the full breakdown.",

    usCountyPageHeadingTemplate: "What's your income percentile in {county}?",
    usCountyMetaDescriptionTemplate: "The median household income in {county} is {median}. See how your salary compares — plus top 1%, 5%, 10%, and 25% income thresholds.",
    usCountyVsStateTemplate: "That ranks in the top {percent}% of {state}.",
    usCountyVsNationalTemplate: "Nationally, it ranks in the top {percent}%.",
    usCountyThresholdsHeading: "Income thresholds in this county",
    usCountyNearbyHeading: "Nearby counties",
    usCountyCtaHeadingTemplate: "See exactly where you rank in {county}",
    usCountyCtaBody: "Enter your income, gender, marital status, and age — takes about 30 seconds.",
    usCountyCtaButton: "Calculate my percentile",
    usCountyPlaceListHeadingTemplate: "Cities in {county}",
    usCountyPlaceListHint: "Median household income by city. Tap a city to see its rank added to your dashboard.",
    usCountyMapPickHint: "Pick a city from the list to see it marked on the map.",
    usCountyViewResultsForPlaceTemplate: "View results for {place}",

    usPlacePageHeadingTemplate: "What's your income percentile in {place}?",
    usPlaceMetaDescriptionTemplate: "The median household income in {place} is {median}. See how your salary compares against the county, state, and national medians.",
    usPlaceVsCountyTemplate: "That ranks in the top {percent}% of {county}.",
    usPlaceVsStateTemplate: "That ranks in the top {percent}% of {state}.",
    usPlaceVsNationalTemplate: "Nationally, it ranks in the top {percent}%.",
    usPlaceMedianLabel: "This city's median household income",
    usPlaceCtaHeadingTemplate: "See exactly where you rank in {place}",
    usPlaceOtherCitiesHeading: "Other cities in this county",

    usStatePercentileHeroLabel: "Top in this state",
    usPlacePercentileHeroLabel: "Top in this city",
    usResultDashboardIntro: "See how you rank nationwide, in your state and county, against your age group, and by net worth and 401(k) — all in one place.",
    usResultMissingLocationTitle: "Pick a location on the map first",
    usResultMissingLocationDesc: "You'll need to select a state and county before we can show your result.",
    usResultMissingLocationCta: "Choose on the map",
    usDashboardIncomeSectionTitle: "Income rank",
    usDashboardCompareChartTitle: "Compare at a glance",
    usDashboardIncomeLabel: "income",
    usDashboardPlaceIncomeLabel: "city income",
    usDashboardStateIncomeLabel: "state income",
    usDashboardCountyIncomeLabel: "county income",
    usDashboardNationalIncomeLabel: "nationwide income",
    usDashboardAgeIncomeLabelTemplate: "{age} income",
    usDashboardNetWorthLabel: "net worth",
    usDashboardAgeNetWorthLabelTemplate: "{age} net worth",
    usDashboardHeadlineComboTemplate: "By {baseLabel} you're in the top {basePercent}%, but by {bestLabel} you climb to the top {bestPercent}%!",
    usDashboardHeadlineSingleTemplate: "You're in the top {bestPercent}% by {bestLabel}!",
    usDashboardSharePromptTitle: "Pick a location to unlock your share card",
    usDashboardSharePromptDesc: "Choose a state and county on the map to get a shareable card and compare with a friend.",
    usDashboardPlaceSectionHeading: "Choose a city (optional)",
    usDashboardPlaceSectionHint: "Pick a city in this county to add its rank to your dashboard.",
    usDashboardPlaceSelectedLabel: "Selected city",
    usCityPickerAriaLabel: "Choose a city",
    usDetailsToggleShow: "Show distribution charts",
    usDetailsToggleHide: "Hide distribution charts",
    usDashboardAddMoreHint: "Add your net worth and 401(k) to unlock more rankings.",

    footerInsights: "Insights",
    usInsightsTitle: "Insights",
    usInsightsIntro: "Short reads on income percentiles, regional data, and what the numbers actually mean.",
    usInsightsEmpty: "New articles are coming soon.",
    usInsightsBackToList: "All insights",
    usInsightsCtaTitle: "So — what's your income percentile?",
    usInsightsCtaBody: "Enter your gender, marital status, and income, then pick your state and county — takes about 30 seconds.",
    usInsightsCtaButton: "Check now",
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
