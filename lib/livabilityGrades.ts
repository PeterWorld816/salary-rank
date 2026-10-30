// Display side of the /us/where-to-live grades: names, one-line meanings and
// fixed colors. The cutoffs themselves live in lib/livabilityConstants.ts.
// Names describe how much room an income has, never the place.
import type { GradeId } from "@/lib/livability";

export const GRADE_LABELS: Record<GradeId, { en: string; ko: string; color: string; meaning: { en: string; ko: string } }> = {
  royal: {
    en: "Royal",
    ko: "로열",
    color: "#FBBF24",
    meaning: { en: "Rent is a small slice and the median home is within reach", ko: "월세 부담이 아주 작고 중위 주택도 가능한 수준" },
  },
  comfortable: { en: "Comfortable", ko: "여유", color: "#34D399", meaning: { en: "Housing leaves plenty of room", ko: "주거비를 내고도 여유가 있는 수준" } },
  okay: { en: "Okay", ko: "무난", color: "#60A5FA", meaning: { en: "Workable with some planning", ko: "계획하면 무난한 수준" } },
  tight: { en: "Tight", ko: "빠듯", color: "#FB923C", meaning: { en: "Housing takes a large share", ko: "주거비 비중이 큰 수준" } },
  stretched: { en: "Stretched", ko: "버거움", color: "#F87171", meaning: { en: "Housing alone would strain this income", ko: "주거비만으로 소득이 버거운 수준" } },
};
