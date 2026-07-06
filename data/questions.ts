// Placeholder question data — replace with real content when building a new app on this skeleton.
// Each option's `tags` feed into matchResult() in results.ts — no engine code needs to change,
// only this file and results.ts.

export type QuestionOption = {
  id: string;
  label: string;
  tags: string[];
};

export type Question = {
  id: string;
  prompt: string;
  options: QuestionOption[];
};

export const questions: Question[] = [
  {
    id: "q1",
    prompt: "질문 1 (placeholder)",
    options: [
      { id: "q1-a", label: "선택지 A (placeholder)", tags: ["tagA"] },
      { id: "q1-b", label: "선택지 B (placeholder)", tags: ["tagB"] },
      { id: "q1-c", label: "선택지 C (placeholder)", tags: ["tagC"] },
    ],
  },
  {
    id: "q2",
    prompt: "질문 2 (placeholder)",
    options: [
      { id: "q2-a", label: "선택지 A (placeholder)", tags: ["tagA"] },
      { id: "q2-b", label: "선택지 B (placeholder)", tags: ["tagB"] },
      { id: "q2-c", label: "선택지 C (placeholder)", tags: ["tagC"] },
    ],
  },
  {
    id: "q3",
    prompt: "질문 3 (placeholder)",
    options: [
      { id: "q3-a", label: "선택지 A (placeholder)", tags: ["tagA"] },
      { id: "q3-b", label: "선택지 B (placeholder)", tags: ["tagB"] },
      { id: "q3-c", label: "선택지 C (placeholder)", tags: ["tagC"] },
    ],
  },
];
