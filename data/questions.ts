// 뇌 구조 테스트 — 질문 8개. 각 선택지의 tags가 data/results.ts의 카테고리 id와 매칭되어
// 뇌를 채운 항목의 비율을 계산하는 데 쓰인다.
//
// prompt/label은 Localized(ko/en)로 관리한다 — 새 테스트를 만들 때도 이 구조만 채우면
// 별도 배선 없이 언어 토글에 자동으로 연결된다.

import type { Localized } from "@/lib/i18n";

export type QuestionOption = {
  id: string;
  label: Localized;
  tags: string[];
};

export type Question = {
  id: string;
  prompt: Localized;
  options: QuestionOption[];
};

export const questions: Question[] = [
  {
    id: "q1",
    prompt: { ko: "눈 뜨자마자 드는 생각은?", en: "What's the first thought when you open your eyes?" },
    options: [
      { id: "q1-a", label: { ko: "아... 5분만 더", en: "Ugh... 5 more minutes" }, tags: ["sleep"] },
      { id: "q1-b", label: { ko: "배고파... 뭐 먹지", en: "I'm hungry... what should I eat" }, tags: ["hunger"] },
      { id: "q1-c", label: { ko: "오늘 할 일이 산더미네", en: "I have a mountain of stuff to do today" }, tags: ["worry"] },
      { id: "q1-d", label: { ko: "그냥 멍... 아무 생각 없음", en: "Just blank... no thoughts at all" }, tags: ["blank"] },
    ],
  },
  {
    id: "q2",
    prompt: { ko: "카톡 답장이 3시간째 안 온다. 당신은?", en: "No reply to your text for 3 hours. What are you thinking?" },
    options: [
      { id: "q2-a", label: { ko: "무슨 일 있나... 계속 걱정됨", en: "Did something happen? I can't stop worrying" }, tags: ["worry"] },
      { id: "q2-b", label: { ko: "읽씹당한 거 아냐? 현타온다", en: "Did they just leave me on read? So embarrassing" }, tags: ["cringe"] },
      { id: "q2-c", label: { ko: "에라 모르겠다, 딴 생각이나 하자", en: "Whatever, let me think about something else" }, tags: ["blank"] },
      { id: "q2-d", label: { ko: "저 사람 지금 뭐 하고 있을지 궁금", en: "I wonder what they're doing right now" }, tags: ["love"] },
    ],
  },
  {
    id: "q3",
    prompt: { ko: "회의·수업 중 갑자기 조용해졌다. 당신 머릿속은?", en: "The room suddenly goes quiet in a meeting or class. What's going on in your head?" },
    options: [
      { id: "q3-a", label: { ko: "졸려... 눈이 감긴다", en: "So sleepy... my eyes are closing" }, tags: ["sleep"] },
      { id: "q3-b", label: { ko: "다들 나만 보는 거 아니야? 눈치 보임", en: "Is everyone looking at me? I'm reading the room" }, tags: ["nunchi"] },
      { id: "q3-c", label: { ko: "점심 뭐 먹지 고민 중", en: "Thinking hard about what to eat for lunch" }, tags: ["hunger"] },
      { id: "q3-d", label: { ko: "괜히 텐션 올라서 딴짓하고 싶음", en: "Feeling randomly hyped and want to mess around" }, tags: ["hype"] },
    ],
  },
  {
    id: "q4",
    prompt: { ko: "주말 약속이 갑자기 취소됐다. 반응은?", en: "Your weekend plans just got cancelled. Your reaction?" },
    options: [
      { id: "q4-a", label: { ko: "잘됐다! 그냥 잘래", en: "Great! I'm just going to sleep" }, tags: ["sleep"] },
      { id: "q4-b", label: { ko: "심심한데 뭐 시켜먹지", en: "I'm bored, what should I order to eat" }, tags: ["hunger"] },
      { id: "q4-c", label: { ko: "혹시 나 때문인가... 신경 쓰임", en: "Was it because of me... now I'm anxious" }, tags: ["worry", "nunchi"] },
      { id: "q4-d", label: { ko: "오히려 좋아, 신난다!", en: "Even better, I'm hyped!" }, tags: ["hype"] },
    ],
  },
  {
    id: "q5",
    prompt: { ko: "좋아하는 사람에게 연락이 왔다. 당신은?", en: "The person you like just texted you. What now?" },
    options: [
      { id: "q5-a", label: { ko: "심장 두근두근, 답장 뭐라 하지", en: "Heart racing, what should I even reply" }, tags: ["love"] },
      { id: "q5-b", label: { ko: "타이밍 재면서 답장 늦게 보냄 (밀당)", en: "Timing my reply to seem less eager (playing it cool)" }, tags: ["nunchi"] },
      { id: "q5-c", label: { ko: "귀찮아서 나중에 읽어야지", en: "Too much effort, I'll read it later" }, tags: ["lazy"] },
      { id: "q5-d", label: { ko: "갑자기 배고파짐 (왜지)", en: "Suddenly hungry (why though)" }, tags: ["hunger"] },
    ],
  },
  {
    id: "q6",
    prompt: { ko: "해야 할 일이 산더미다. 당신의 선택은?", en: "You've got a mountain of things to do. What do you choose?" },
    options: [
      { id: "q6-a", label: { ko: "일단 침대에 눕는다", en: "Lie down in bed first" }, tags: ["sleep"] },
      { id: "q6-b", label: { ko: "내일의 나에게 맡긴다", en: "Leave it to tomorrow's me" }, tags: ["lazy"] },
      { id: "q6-c", label: { ko: "하나도 못 끝낼까 봐 불안하다", en: "Anxious I won't finish any of it" }, tags: ["worry"] },
      { id: "q6-d", label: { ko: "일단 딴생각하며 현실도피", en: "Zone out and escape reality for now" }, tags: ["blank"] },
    ],
  },
  {
    id: "q7",
    prompt: { ko: "친구들이 다 같이 웃는데 나만 포인트를 못 잡았다. 당신은?", en: "Everyone's laughing together but you missed the joke. What do you do?" },
    options: [
      { id: "q7-a", label: { ko: "따라 웃으면서 눈치껏 넘어간다", en: "Laugh along and play it off" }, tags: ["nunchi"] },
      { id: "q7-b", label: { ko: "왜 나만 못 웃었지... 현타", en: "Why didn't I get it... so embarrassing" }, tags: ["cringe"] },
      { id: "q7-c", label: { ko: "그냥 웃긴가 보다 하고 넘어감", en: "Just assume it's funny and move on" }, tags: ["blank"] },
      { id: "q7-d", label: { ko: "오히려 더 크게 웃으며 텐션 올림", en: "Laugh even louder and hype it up" }, tags: ["hype"] },
    ],
  },
  {
    id: "q8",
    prompt: { ko: "잠들기 직전 마지막 생각은?", en: "Your very last thought before falling asleep?" },
    options: [
      { id: "q8-a", label: { ko: "아 배고프다... 야식 생각", en: "Ugh I'm hungry... thinking about a midnight snack" }, tags: ["hunger"] },
      { id: "q8-b", label: { ko: "오늘 실수한 거 없나 걱정", en: "Worrying if I messed something up today" }, tags: ["worry"] },
      { id: "q8-c", label: { ko: "좋아하는 사람 생각하다 잠듦", en: "Drift off thinking about someone I like" }, tags: ["love"] },
      { id: "q8-d", label: { ko: "그냥 아무 생각 없이 기절", en: "Just pass out with no thoughts at all" }, tags: ["sleep", "blank"] },
    ],
  },
];
