import type { Metadata } from "next";
import { decodeBreakdown } from "@/data/results";
import ResultClient from "./ResultClient";

type RawSP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined, fallback = ""): string {
  if (Array.isArray(v)) return v[0] ?? fallback;
  return v ?? fallback;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: RawSP;
}): Promise<Metadata> {
  const d = str(searchParams.d);
  const breakdown = decodeBreakdown(d);
  const top = breakdown[0];

  const title = top
    ? `${top.result.emoji} 내 뇌의 ${top.percent}%는 '${top.result.title}'`
    : "🧠 뇌 구조 테스트";
  const desc = top
    ? `${breakdown.slice(0, 3).map((b) => `${b.result.title} ${b.percent}%`).join(" · ")} — 뇌 구조 테스트 결과`
    : "질문 8개로 알아보는 내 뇌 속 비율";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ogUrl   = `${baseUrl}/api/og?${new URLSearchParams({ d }).toString()}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogUrl],
    },
  };
}

export default function ResultPage() {
  return <ResultClient />;
}
