// 뇌 구조 테스트 — 질문 8개. 각 선택지의 tags가 data/results.ts의 카테고리 id와 매칭되어
// 뇌를 채운 항목의 비율을 계산하는 데 쓰인다.

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
    prompt: "눈 뜨자마자 드는 생각은?",
    options: [
      { id: "q1-a", label: "아... 5분만 더", tags: ["sleep"] },
      { id: "q1-b", label: "배고파... 뭐 먹지", tags: ["hunger"] },
      { id: "q1-c", label: "오늘 할 일이 산더미네", tags: ["worry"] },
      { id: "q1-d", label: "그냥 멍... 아무 생각 없음", tags: ["blank"] },
    ],
  },
  {
    id: "q2",
    prompt: "카톡 답장이 3시간째 안 온다. 당신은?",
    options: [
      { id: "q2-a", label: "무슨 일 있나... 계속 걱정됨", tags: ["worry"] },
      { id: "q2-b", label: "읽씹당한 거 아냐? 현타온다", tags: ["cringe"] },
      { id: "q2-c", label: "에라 모르겠다, 딴 생각이나 하자", tags: ["blank"] },
      { id: "q2-d", label: "저 사람 지금 뭐 하고 있을지 궁금", tags: ["love"] },
    ],
  },
  {
    id: "q3",
    prompt: "회의·수업 중 갑자기 조용해졌다. 당신 머릿속은?",
    options: [
      { id: "q3-a", label: "졸려... 눈이 감긴다", tags: ["sleep"] },
      { id: "q3-b", label: "다들 나만 보는 거 아니야? 눈치 보임", tags: ["nunchi"] },
      { id: "q3-c", label: "점심 뭐 먹지 고민 중", tags: ["hunger"] },
      { id: "q3-d", label: "괜히 텐션 올라서 딴짓하고 싶음", tags: ["hype"] },
    ],
  },
  {
    id: "q4",
    prompt: "주말 약속이 갑자기 취소됐다. 반응은?",
    options: [
      { id: "q4-a", label: "잘됐다! 그냥 잘래", tags: ["sleep"] },
      { id: "q4-b", label: "심심한데 뭐 시켜먹지", tags: ["hunger"] },
      { id: "q4-c", label: "혹시 나 때문인가... 신경 쓰임", tags: ["worry", "nunchi"] },
      { id: "q4-d", label: "오히려 좋아, 신난다!", tags: ["hype"] },
    ],
  },
  {
    id: "q5",
    prompt: "좋아하는 사람에게 연락이 왔다. 당신은?",
    options: [
      { id: "q5-a", label: "심장 두근두근, 답장 뭐라 하지", tags: ["love"] },
      { id: "q5-b", label: "타이밍 재면서 답장 늦게 보냄 (밀당)", tags: ["nunchi"] },
      { id: "q5-c", label: "귀찮아서 나중에 읽어야지", tags: ["lazy"] },
      { id: "q5-d", label: "갑자기 배고파짐 (왜지)", tags: ["hunger"] },
    ],
  },
  {
    id: "q6",
    prompt: "해야 할 일이 산더미다. 당신의 선택은?",
    options: [
      { id: "q6-a", label: "일단 침대에 눕는다", tags: ["sleep"] },
      { id: "q6-b", label: "내일의 나에게 맡긴다", tags: ["lazy"] },
      { id: "q6-c", label: "하나도 못 끝낼까 봐 불안하다", tags: ["worry"] },
      { id: "q6-d", label: "일단 딴생각하며 현실도피", tags: ["blank"] },
    ],
  },
  {
    id: "q7",
    prompt: "친구들이 다 같이 웃는데 나만 포인트를 못 잡았다. 당신은?",
    options: [
      { id: "q7-a", label: "따라 웃으면서 눈치껏 넘어간다", tags: ["nunchi"] },
      { id: "q7-b", label: "왜 나만 못 웃었지... 현타", tags: ["cringe"] },
      { id: "q7-c", label: "그냥 웃긴가 보다 하고 넘어감", tags: ["blank"] },
      { id: "q7-d", label: "오히려 더 크게 웃으며 텐션 올림", tags: ["hype"] },
    ],
  },
  {
    id: "q8",
    prompt: "잠들기 직전 마지막 생각은?",
    options: [
      { id: "q8-a", label: "아 배고프다... 야식 생각", tags: ["hunger"] },
      { id: "q8-b", label: "오늘 실수한 거 없나 걱정", tags: ["worry"] },
      { id: "q8-c", label: "좋아하는 사람 생각하다 잠듦", tags: ["love"] },
      { id: "q8-d", label: "그냥 아무 생각 없이 기절", tags: ["sleep", "blank"] },
    ],
  },
];
