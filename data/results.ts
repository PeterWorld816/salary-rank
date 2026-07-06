// 뇌 구조 테스트 — 결과 카테고리(뇌를 채운 항목들)와 비율 계산 로직.
// computeBreakdown()이 선택한 답변들의 tags를 집계해 카테고리별 비율(%)을 계산한다.
// 새로운 테스트를 만들 때는 이 파일과 questions.ts만 바꾸면 된다.

import type { QuestionOption } from "./questions";

export type ResultDef = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tags: string[];
  color?: string;
};

export const results: ResultDef[] = [
  {
    id: "sleep",
    title: "잠",
    description: "당신의 뇌 대부분은 '더 자고 싶다'는 생각으로 가득해요. 지금도 눈꺼풀이 무겁죠?",
    emoji: "😴",
    tags: ["sleep"],
    color: "#6366F1",
  },
  {
    id: "hunger",
    title: "배고픔",
    description: "당신 뇌의 메인 테마는 '다음 끼니'입니다. 방금 밥 먹었어도 배고픈 타입.",
    emoji: "🍔",
    tags: ["hunger"],
    color: "#F59E0B",
  },
  {
    id: "worry",
    title: "걱정",
    description: "머릿속이 걱정으로 꽉 찼어요. 일어나지도 않은 일까지 미리 걱정하는 중.",
    emoji: "😰",
    tags: ["worry"],
    color: "#EF4444",
  },
  {
    id: "love",
    title: "사랑",
    description: "누군가에 대한 생각으로 하루 종일 두근두근. 뇌 용량 대부분을 '그 사람'이 차지하고 있어요.",
    emoji: "💕",
    tags: ["love"],
    color: "#EC4899",
  },
  {
    id: "blank",
    title: "아무생각",
    description: "정말 아무 생각이 없습니다. 무념무상, 어떤 의미로는 제일 평화로운 뇌.",
    emoji: "🌀",
    tags: ["blank"],
    color: "#9CA3AF",
  },
  {
    id: "cringe",
    title: "현타",
    description: "지나간 일을 곱씹으며 이불킥 중. 뇌의 상당 부분이 '현타'로 가동되고 있어요.",
    emoji: "😮‍💨",
    tags: ["cringe"],
    color: "#8B5CF6",
  },
  {
    id: "nunchi",
    title: "눈치",
    description: "분위기 파악 담당 뇌. 남들 반응 살피느라 정작 내 생각은 뒷전이에요.",
    emoji: "👀",
    tags: ["nunchi"],
    color: "#10B981",
  },
  {
    id: "hype",
    title: "흥",
    description: "텐션이 항상 만렙. 뇌가 흥으로 가동되는 타입, 어디서든 분위기 메이커.",
    emoji: "🕺",
    tags: ["hype"],
    color: "#F97316",
  },
  {
    id: "lazy",
    title: "귀찮음",
    description: "귀찮음이 뇌를 지배 중. '나중에 하지 뭐'가 인생 모토.",
    emoji: "🦥",
    tags: ["lazy"],
    color: "#64748B",
  },
];

export function getResultById(id: string): ResultDef | undefined {
  return results.find((r) => r.id === id);
}

export type BreakdownItem = { result: ResultDef; percent: number };

// 선택한 답변들의 tags를 집계해 카테고리별 비율(%)을 계산한다. 반올림 오차는
// 최대 나머지법(largest remainder)으로 보정해 합이 항상 정확히 100이 되게 한다.
export function computeBreakdown(selected: QuestionOption[]): BreakdownItem[] {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const opt of selected) {
    for (const tag of opt.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1;
      total += 1;
    }
  }
  if (total === 0) return [];

  const entries = results
    .filter((r) => counts[r.id] > 0)
    .map((r) => {
      const exact = (counts[r.id] / total) * 100;
      return { result: r, exact, percent: Math.floor(exact) };
    });

  let remainder = 100 - entries.reduce((sum, e) => sum + e.percent, 0);
  const byRemainder = [...entries].sort(
    (a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact))
  );
  for (let i = 0; i < remainder; i++) byRemainder[i % byRemainder.length].percent += 1;

  return entries
    .map(({ result, percent }) => ({ result, percent }))
    .sort((a, b) => b.percent - a.percent);
}

export function encodeBreakdown(breakdown: BreakdownItem[]): string {
  return breakdown.map((b) => `${b.result.id}:${b.percent}`).join(",");
}

export function decodeBreakdown(raw: string): BreakdownItem[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((pair) => {
      const [id, pct] = pair.split(":");
      const result = getResultById(id);
      if (!result) return null;
      return { result, percent: Number(pct) || 0 };
    })
    .filter((x): x is BreakdownItem => x !== null)
    .sort((a, b) => b.percent - a.percent);
}
