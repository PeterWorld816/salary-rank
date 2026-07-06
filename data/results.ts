// Placeholder result data — replace with real content when building a new app on this skeleton.
// matchResult() tallies the tags of every selected option and returns the result whose `tags`
// overlap the most. Changing this file (and questions.ts) is the only thing needed to point
// the whole question → result → OG → share pipeline at a new set of outcomes.

import type { QuestionOption } from "./questions";

export type ResultDef = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tags: string[];
};

export const results: ResultDef[] = [
  {
    id: "result-a",
    title: "결과 A (placeholder)",
    description: "결과 A에 대한 설명 placeholder",
    emoji: "🅰️",
    tags: ["tagA"],
  },
  {
    id: "result-b",
    title: "결과 B (placeholder)",
    description: "결과 B에 대한 설명 placeholder",
    emoji: "🅱️",
    tags: ["tagB"],
  },
  {
    id: "result-c",
    title: "결과 C (placeholder)",
    description: "결과 C에 대한 설명 placeholder",
    emoji: "🇨",
    tags: ["tagC"],
  },
];

export function matchResult(selected: QuestionOption[]): ResultDef {
  const tagCounts: Record<string, number> = {};
  for (const opt of selected) {
    for (const tag of opt.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  let best = results[0];
  let bestScore = -Infinity;
  for (const r of results) {
    const score = r.tags.reduce((sum, tag) => sum + (tagCounts[tag] ?? 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

export function getResultById(id: string): ResultDef | undefined {
  return results.find((r) => r.id === id);
}
