import { getTier } from "@/lib/tier";

export type ShieldShareSummary = {
  percent: number;
  age?: string;
  agePercent?: number;
  state?: string;
  statePercent?: number;
  // Net worth card: only the percentile + age comparison travel in the URL
  // (no amount), same minimal-params rule as the income card.
  metric?: "income" | "netWorth";
};

export function shieldShareImagePath(summary: ShieldShareSummary, variant: "wide" | "story" = "wide"): string {
  const params = new URLSearchParams({ p: String(summary.percent) });
  if (summary.age) params.set("age", summary.age);
  if (summary.agePercent != null) params.set("pa", String(summary.agePercent));
  if (summary.state) params.set("st", summary.state);
  if (summary.statePercent != null) params.set("ps", String(summary.statePercent));
  if (summary.metric === "netWorth") params.set("m", "nw");
  if (variant === "story") params.set("card", "story");
  return `/us/og?${params.toString()}`;
}

export function shieldNetWorthShareText(percent: number): string {
  return `My net worth is in the top ${Math.round(percent)}% of US households. Where do you rank?`;
}

export function shieldShareText(percent: number): string {
  const tier = getTier(percent);
  return `I'm in the top ${Math.round(percent)}% of US earners. ${tier.label} tier. Where do you rank?`;
}
