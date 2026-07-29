import type { Metadata } from "next";
import { decodeSalaryInput, computeSalaryRank } from "@/lib/salaryCalc";
import { computeNetWorthRank } from "@/lib/netWorthCalc";
import { translations, isLangCode, DEFAULT_LANG } from "@/lib/i18n";
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
  const nw = str(searchParams.nw);
  const langParam = str(searchParams.lang);
  const lang = isLangCode(langParam) ? langParam : DEFAULT_LANG;
  const input = decodeSalaryInput(d);
  const netWorth = Number(nw);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const ogUrl = `${baseUrl}/api/og?${new URLSearchParams({ d, nw, lang }).toString()}`;

  const t = translations[lang];
  let title = t.appTitle;
  let desc = t.tagline;

  if (input) {
    const rankResult = computeSalaryRank(input);
    const netWorthResult =
      Number.isFinite(netWorth) && netWorth > 0
        ? computeNetWorthRank({
            ageGroup: input.ageGroup,
            maritalStatus: input.maritalStatus,
            region: input.region,
            district: input.district,
            netWorth,
          })
        : null;
    const built = buildResultShareText(lang, input, rankResult, netWorthResult);
    title = built.title;
    desc = built.description;
  }

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
