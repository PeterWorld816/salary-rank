import type { Metadata } from "next";
import { getAppLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata } from "@/lib/seo";
import StateResultClient from "./StateResultClient";

const META = {
  us: {
    title: "Your Income Rank In Your County & State",
    description: "See how your income compares to people in your own county and state.",
  },
  kr: {
    title: "같은 카운티·주 내 소득 순위",
    description: "당신이 선택한 카운티·주 주민들과 소득을 비교해보세요.",
  },
} as const;

export function generateMetadata(): Metadata {
  const locale = getAppLocale();
  const m = META[locale];
  return pageMetadata(locale, getOriginalPathname(), m.title, m.description);
}

export default function StateResultPage() {
  return <StateResultClient />;
}
