export type ReceiptGrade = {
  minRank: number;
  maxRank: number;
  label: string;
  line: string;
  stamp: string;
  background: string;
};

export const RECEIPT_GRADES: readonly ReceiptGrade[] = [
  { minRank: 1, maxRank: 5, label: "S", line: "TOP SHELF. UNFAIRLY GOOD.", stamp: "MAIN CHARACTER", background: "#ff5a36" },
  { minRank: 6, maxRank: 15, label: "A+", line: "HIGH FLYER. THE VIEW IS NICE UP HERE.", stamp: "VIP", background: "#2f55ff" },
  { minRank: 16, maxRank: 25, label: "A", line: "STRONG. SOLID. A LITTLE SHOWY.", stamp: "CERTIFIED", background: "#2f55ff" },
  { minRank: 26, maxRank: 40, label: "B+", line: "SOLID. DEPENDABLE. DINNER OUT ON A WHIM.", stamp: "NOT BAD", background: "#2f55ff" },
  { minRank: 41, maxRank: 55, label: "B", line: "RIGHT IN THE MIDDLE. RELATABLE.", stamp: "RELATABLE", background: "#2f55ff" },
  { minRank: 56, maxRank: 70, label: "C+", line: "STEADY CLIMB. WATCH THIS SPACE.", stamp: "ON THE RISE", background: "#1fbf8f" },
  { minRank: 71, maxRank: 85, label: "C", line: "BUILDING ERA. THE PLOT HAS NOT PEAKED.", stamp: "LEVELING UP", background: "#1fbf8f" },
  { minRank: 86, maxRank: 100, label: "D", line: "EARLY CHAPTER. EVERYONE STARTS SOMEWHERE.", stamp: "JUST GETTING STARTED", background: "#1fbf8f" },
];

export function receiptRankFromPercent(percent: number): number {
  return Math.max(1, Math.min(100, Math.round(percent)));
}

export function getReceiptGrade(rank: number): ReceiptGrade {
  const normalizedRank = Math.max(1, Math.min(100, Math.round(rank)));
  return RECEIPT_GRADES.find((grade) => normalizedRank >= grade.minRank && normalizedRank <= grade.maxRank) ?? RECEIPT_GRADES.at(-1)!;
}

export function receiptShareText(rank: number): string {
  const grade = getReceiptGrade(rank);
  return `I'm #${rank} out of 100 Americans (grade ${grade.label}). Where do you rank?`;
}

export function formatReceiptDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date).replace(",", "").toUpperCase();
}

export const RECEIPT_IMAGE_WIDTH = 1080;
export const RECEIPT_IMAGE_HEIGHT = 1350;
