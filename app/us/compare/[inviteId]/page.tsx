// "Compare with a friend" landing page — the invite link built by
// buildCompareInviteHref (lib/usInput.ts) encodes the inviter's full answer
// set into [inviteId] (same encodeUsInput every other /us link already
// uses) and their location into ?st=/?co=/?pl=, so this route never needs
// its own server-side storage — same no-server-storage principle as the
// rest of /us. Unbounded per-invite URL space (like /us/result), so this
// is never statically prerendered and isn't worth indexing.
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { getCountyIncome, getPlaceIncome } from "@/lib/usCountyPlaceData";
import { decodeUsInput } from "@/lib/usInput";
import { getAppLocale, getLangForLocale, getOriginalPathname } from "@/lib/serverLocale";
import { pageMetadata, siteTitle, siteDescription } from "@/lib/seo";
import { translations } from "@/lib/i18n";
import { stripStateSuffix } from "@/lib/usFormat";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import CompareClient from "@/components/us/compare/CompareClient";

type Params = { inviteId: string };
type SearchParams = Record<string, string | string[] | undefined>;

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale = getAppLocale();
  const path = `/us/compare/${params.inviteId}`;
  return { ...pageMetadata(locale, path, siteTitle(locale), siteDescription(locale)), robots: { index: false, follow: true } };
}

export default function ComparePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const locale = getAppLocale();
  const lang = getLangForLocale(locale);
  const t = translations[lang];
  const base = locale === "kr" ? "/kr" : "/us";

  const stAbbr = typeof searchParams.st === "string" ? searchParams.st : undefined;
  const coFips = typeof searchParams.co === "string" ? searchParams.co : undefined;
  const plFips = typeof searchParams.pl === "string" ? searchParams.pl : undefined;

  const inviterInput = decodeUsInput(params.inviteId);
  const state = stAbbr ? getStateByAbbr(stAbbr) : null;
  const county = coFips ? getCountyIncome(coFips) : null;
  const place = plFips ? getPlaceIncome(plFips) : null;

  // A malformed/hand-edited link (bad inviteId, or st/co that no longer
  // resolve) isn't worth a 404 — same "graceful fallback, not notFound()"
  // call the county/place pages make for a stale place fips.
  if (!inviterInput || !state || !county) {
    return (
      <UsShell>
        <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
          <Link
            href={base}
            className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.footerBackHome}
          </Link>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-10 text-center">
            <p className="mb-1.5 text-[15px] font-semibold text-white/80">{t.usCountyNoDataTitle}</p>
            <p className="text-[13px] text-white/45">{t.usCountyNoDataDesc}</p>
          </div>
          <Footer />
        </div>
      </UsShell>
    );
  }

  const locationName = place ? stripStateSuffix(place.name, state.name) : stripStateSuffix(county.name, state.name);

  return (
    <UsShell>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          href={base}
          className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.footerBackHome}
        </Link>

        <h1 className="mb-2 text-[24px] font-extrabold tracking-tight text-balance">{t.usComparePageTitle}</h1>
        <p className="mb-8 text-[14px] leading-relaxed text-white/55">{t.usCompareInviteIntro}</p>

        <CompareClient
          inviterInput={inviterInput}
          state={state}
          county={county}
          place={place}
          locationName={`${locationName}, ${state.name}`}
        />

        <Footer />
      </div>
    </UsShell>
  );
}
