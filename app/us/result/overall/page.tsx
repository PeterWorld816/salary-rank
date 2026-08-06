import type { Metadata } from "next";
import { getAppLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata } from "@/lib/seo";
import OverallResultClient from "./OverallResultClient";

const META = {
  us: {
    title: "Your Overall US Income Percentile",
    description: "See where your income ranks against the entire US population.",
  },
  kr: {
    title: "전체 소득 순위 — 미국 상위 몇 %?",
    description: "미국 전체 인구와 비교했을 때 당신의 소득 순위를 확인하세요.",
  },
} as const;

export function generateMetadata(): Metadata {
  const locale = getAppLocale();
  const m = META[locale];
  return pageMetadata(locale, getOriginalPathname(), m.title, m.description);
}

export default function OverallResultPage() {
  return <OverallResultClient />;
}
