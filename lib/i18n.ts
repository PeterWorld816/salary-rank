// Pure i18n data/logic — no React, no "use client". Safe to import from
// client components, server components, and edge routes (e.g. app/api/og)
// alike. The React-facing context/hook lives in lib/LanguageProvider.tsx.
//
// This is the single place UI chrome copy (buttons, nav, disclaimers) lives.
// Content data (quiz questions, result copy) lives in data/*.ts using the
// same `Localized` shape — see pick() below to resolve either one.

export type LangCode = "ko" | "en";

// Any piece of content that varies by language — used across data/*.ts too.
export type Localized = Record<LangCode, string>;

export function pick(text: Localized, lang: LangCode): string {
  return text[lang] ?? text.ko;
}

// "{key}" 자리표시자를 vars의 값으로 채운다. shareTitle처럼 여러 곳에서 쓰는
// 번역 템플릿 문자열에 공통으로 사용.
export function formatTemplate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{${key}}`).join(String(value)),
    template
  );
}

// 데이터는 항상 만원 단위로 저장돼 있다. 한국어 화면은 그대로 "만원"을 붙이고,
// 영어 화면은 익숙한 K(천) 단위로 보이게 10을 곱해 "K KRW"를 붙인다.
export function currencyValueFor(manwon: number, lang: LangCode): number {
  return lang === "en" ? manwon * 10 : manwon;
}

export function formatCurrency(manwon: number, lang: LangCode): string {
  const value = currencyValueFor(manwon, lang);
  return value.toLocaleString(lang === "ko" ? "ko-KR" : "en-US");
}

export interface Translations {
  // ── Content placeholders (fill in when building a real app on this skeleton)
  appTitle: string;
  tagline: string;
  disclaimer: string;
  privacyNotice: string;
  // ── Result screen copy
  resultCardLabel: string;
  shareTitle: string; // template: {percent} {annual}
  percentileHeroLabel: string;
  monthlyRangeTemplate: string; // template: {min} {max}
  annualEstimateTemplate: string; // template: {value}
  distributionTitle: string;
  distributionYouAreHere: string;
  distributionAverageTick: string;
  distributionLowLabel: string;
  distributionHighLabel: string;
  comparisonTitle: string;
  comparisonAge: string;
  comparisonIndustry: string;
  comparisonRegion: string;
  topPercentTemplate: string; // template: {percent}
  jobVibeTitle: string;
  jobVibeDisclaimer: string;
  jobVibeWlb: string;
  jobVibeGrowth: string;
  jobVibeHip: string;
  sourceLabel: string;
  sourceText: string;
  sourceNote: string;
  // ── Nav / actions (structural chrome, real copy)
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
}

export const translations: Record<LangCode, Translations> = {
  ko: {
    appTitle: "💰 내 연봉 상위 몇 %?",
    tagline: "나이·성별·직종·기업규모·지역으로 알아보는 내 소득 위치",
    disclaimer: "통계청 공개 데이터 기반 추정치이며, 개인의 실제 소득과 다를 수 있습니다.",
    privacyNotice: "개인정보를 수집하지 않습니다. 모든 계산은 이 브라우저 안에서만 이뤄집니다.",
    resultCardLabel: "내 연봉 위치는?",
    shareTitle: "💰 나는 상위 {percent}%! 예상 연봉 약 {annual}만원",
    percentileHeroLabel: "당신은 상위",
    monthlyRangeTemplate: "예상 월 소득 {min}~{max}만원",
    annualEstimateTemplate: "예상 연봉 약 {value}만원",
    distributionTitle: "전체 소득 분포에서 내 위치",
    distributionYouAreHere: "너 여기!",
    distributionAverageTick: "평균",
    distributionLowLabel: "소득 낮음",
    distributionHighLabel: "소득 높음",
    comparisonTitle: "여러 각도로 보면",
    comparisonAge: "동일 연령대",
    comparisonIndustry: "동일 직종",
    comparisonRegion: "동일 지역",
    topPercentTemplate: "상위 {percent}%",
    jobVibeTitle: "직업 MZ 지수",
    jobVibeDisclaimer: "재미로 보는 지표예요. 통계 데이터가 아니에요 😉",
    jobVibeWlb: "워라밸",
    jobVibeGrowth: "성장성",
    jobVibeHip: "힙함",
    sourceLabel: "데이터 출처",
    sourceText: "통계청 2023년 임금근로일자리 소득(보수) 결과",
    sourceNote: "위 수치는 공개 통계를 근거로 계산한 추정치예요.",
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
  },
  en: {
    appTitle: "💰 What's My Salary Percentile?",
    tagline: "Find your income rank by age, gender, job, company size & region",
    disclaimer: "An estimate based on public Statistics Korea data — actual individual income may differ.",
    privacyNotice: "We don't collect personal data. Every calculation runs right in your browser.",
    resultCardLabel: "Where does my salary rank?",
    shareTitle: "💰 Top {percent}%! Est. annual salary ~{annual}K KRW",
    percentileHeroLabel: "You're in the top",
    monthlyRangeTemplate: "Est. monthly income {min}~{max}K KRW",
    annualEstimateTemplate: "Est. annual salary ~{value}K KRW",
    distributionTitle: "Where you stand in the income distribution",
    distributionYouAreHere: "You're here!",
    distributionAverageTick: "avg",
    distributionLowLabel: "Lower income",
    distributionHighLabel: "Higher income",
    comparisonTitle: "From different angles",
    comparisonAge: "Same age group",
    comparisonIndustry: "Same industry",
    comparisonRegion: "Same region",
    topPercentTemplate: "Top {percent}%",
    jobVibeTitle: "Job Vibe Index",
    jobVibeDisclaimer: "Just for fun — not based on statistics 😉",
    jobVibeWlb: "Work-life",
    jobVibeGrowth: "Growth",
    jobVibeHip: "Hipness",
    sourceLabel: "Data source",
    sourceText: "Statistics Korea, 2023 Wage & Salary Job Income Report",
    sourceNote: "Figures are estimates calculated from public statistics.",
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

// 통계청 「2023년 임금근로일자리 소득(보수) 결과」 보도자료 — sourceText/sourceLabel이
// 가리키는 실제 출처 링크. 언어와 무관하게 동일한 원본 자료를 가리킨다.
export const SOURCE_URL =
  "https://kostat.go.kr/board.es?act=view&bid=11113&list_no=435195&mid=a10301010000";

export function detectBrowserLang(): LangCode {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  return navigator.language.slice(0, 2).toLowerCase() === "ko" ? "ko" : "en";
}

export function isLangCode(value: unknown): value is LangCode {
  return value === "ko" || value === "en";
}
