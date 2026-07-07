import type { Metadata } from "next";
import { decodeBreakdown } from "@/data/results";
import { isLangCode, DEFAULT_LANG } from "@/lib/i18n";
import { buildResultShareText } from "@/lib/shareText";
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
  const langParam = str(searchParams.lang);
  const lang = isLangCode(langParam) ? langParam : DEFAULT_LANG;
  const breakdown = decodeBreakdown(d);

  const { title, description: desc } = buildResultShareText(lang, breakdown);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ogUrl   = `${baseUrl}/api/og?${new URLSearchParams({ d, lang }).toString()}`;

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
