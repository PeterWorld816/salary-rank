// 직업 MZ 지수 — 워라밸·성장성·힙함을 재미로 매긴 지표. data/salary.json(통계청 출처)과는
// 성격이 다른 데이터라 일부러 별도 파일로 분리했다: salary.json은 신뢰의 핵심(출처 인용)이고,
// 여기 값들은 통계가 아니라 주관적인 재미 요소이기 때문에 절대 섞이면 안 된다.
// 화면에는 항상 "재미 요소, 통계 아님" 문구와 함께 노출한다 (lib/i18n.ts의 jobVibeDisclaimer).

import type { IndustryId } from "@/lib/salaryCalc";
import type { Localized } from "@/lib/i18n";

export type JobVibeEntry = {
  id: IndustryId;
  wlb: number; // 워라밸, 1~5
  growth: number; // 성장성, 1~5
  hip: number; // 힙함, 1~5
  tagline: Localized;
};

export const jobVibes: JobVibeEntry[] = [
  {
    id: "finance",
    wlb: 2,
    growth: 4,
    hip: 3,
    tagline: { ko: "돈은 확실히 되는데 야근도 확실하다", en: "The pay is real, and so is the overtime" },
  },
  {
    id: "utilities",
    wlb: 5,
    growth: 2,
    hip: 1,
    tagline: { ko: "안정성 최고, 칼퇴 보장 — 대신 힙함은 논외", en: "Rock-solid stability and on-time exits — hipness not included" },
  },
  {
    id: "ict",
    wlb: 2,
    growth: 5,
    hip: 5,
    tagline: { ko: "제일 빠르게 크지만 제일 빠르게 갈아치워지는 업계", en: "Fastest to grow, fastest to burn out — the hip one" },
  },
  {
    id: "professional",
    wlb: 3,
    growth: 4,
    hip: 4,
    tagline: { ko: "전문성 하나로 승부하는 힙한 프리랜서 감성", en: "Expertise-driven, with a freelancer-cool edge" },
  },
  {
    id: "manufacturing",
    wlb: 3,
    growth: 3,
    hip: 2,
    tagline: { ko: "묵직하고 안정적, 대신 힙함은 살짝 아쉬움", en: "Solid and steady — hipness takes a back seat" },
  },
  {
    id: "construction",
    wlb: 2,
    growth: 3,
    hip: 2,
    tagline: { ko: "현장은 빡세도 눈에 보이는 결과물은 확실함", en: "Tough on-site, but the results are undeniable" },
  },
  {
    id: "transport",
    wlb: 3,
    growth: 3,
    hip: 2,
    tagline: { ko: "물류 대란 이후로 몸값이 슬금슬금 오르는 중", en: "Quietly rising in value since the logistics crunch" },
  },
  {
    id: "realestate",
    wlb: 3,
    growth: 3,
    hip: 3,
    tagline: { ko: "시장 분위기 따라 기분이 오르락내리락", en: "Your mood tracks the market, for better or worse" },
  },
  {
    id: "wholesale",
    wlb: 3,
    growth: 2,
    hip: 2,
    tagline: { ko: "손님과의 밀당이 매일의 루틴", en: "Daily back-and-forth with customers, part of the job" },
  },
  {
    id: "education",
    wlb: 4,
    growth: 2,
    hip: 3,
    tagline: { ko: "방학 있는 삶, 성장 곡선은 완만함", en: "A life with real vacations — growth curve stays gentle" },
  },
  {
    id: "health",
    wlb: 2,
    growth: 4,
    hip: 3,
    tagline: { ko: "사람 살리는 보람은 크지만 몸도 마음도 갈림", en: "Deeply rewarding work that takes a real toll" },
  },
  {
    id: "arts",
    wlb: 3,
    growth: 3,
    hip: 5,
    tagline: { ko: "제일 힙하지만 지갑은 가벼울 수도", en: "The hippest of all — your wallet might disagree" },
  },
  {
    id: "business_support",
    wlb: 3,
    growth: 2,
    hip: 1,
    tagline: { ko: "묵묵히 돌아가게 만드는 숨은 주역", en: "The quiet backbone keeping everything running" },
  },
  {
    id: "accommodation",
    wlb: 2,
    growth: 2,
    hip: 3,
    tagline: { ko: "핫플의 중심에 있지만 몸은 늘 고생", en: "Right in the middle of every hotspot, and it shows on your feet" },
  },
];

export function getJobVibe(id: IndustryId): JobVibeEntry {
  const found = jobVibes.find((v) => v.id === id);
  if (!found) throw new Error(`Unknown industry id: ${id}`);
  return found;
}
