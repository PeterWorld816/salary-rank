// Scaffolding only, per spec — place (town/city) level detail will use the
// Census Places API (B19013, for=place:*) once built. For now this just
// confirms the route shape and points back to the county result page, which
// already has the real numbers.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { translations, isLangCode } from "@/lib/i18n";
import { getAppLocale, getLangForLocale } from "@/lib/serverLocale";
import UsShell from "@/components/us/UsShell";

type RawSP = Record<string, string | string[] | undefined>;

// This page is an empty shell with no real content yet — keep it out of the
// index until the Census Places data lands, so it doesn't get crawled/ranked
// as a thin/duplicate page in the meantime.
export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

export default function UsPlacePage({
  params,
  searchParams,
}: {
  params: { state: string; county: string; place: string };
  searchParams: RawSP;
}) {
  const state = getStateByAbbr(params.state);
  if (!state) notFound();

  const langParam = Array.isArray(searchParams.lang) ? searchParams.lang[0] : searchParams.lang;
  const lang = isLangCode(langParam) ? langParam : getLangForLocale(getAppLocale());
  const t = translations[lang];

  const qs = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) => (v == null ? [] : [[k, Array.isArray(v) ? v[0] : v]]))
  );
  qs.set("st", params.state);
  qs.set("co", params.county);
  const base = getAppLocale() === "kr" ? "/kr" : "/us";
  const countyHref = `${base}/result?${qs.toString()}`;

  return (
    <UsShell>
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-3 text-[20px] font-extrabold">{t.usPlaceTitle}</h1>
        <p className="mb-8 text-[14px] text-white/55">{t.usPlaceComingSoon}</p>
        <Link
          href={countyHref}
          className="rounded-md border border-white/15 px-6 py-3 text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
        >
          {t.usPlaceBackToCounty}
        </Link>
      </div>
    </UsShell>
  );
}
