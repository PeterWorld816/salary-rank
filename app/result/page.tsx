import type { Metadata } from "next";
import { getResultById } from "@/data/results";
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
  const id = str(searchParams.id);
  const result = getResultById(id);

  const title = result ? `${result.emoji} ${result.title}` : "(app title placeholder)";
  const desc  = result ? result.description : "(app description placeholder)";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ogUrl   = `${baseUrl}/api/og?${new URLSearchParams({ id }).toString()}`;

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
