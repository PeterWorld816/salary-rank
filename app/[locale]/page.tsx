import type { Metadata } from "next";
import { getUsStatesGeo } from "@/lib/usGeo";
import { localeFromParams, localeBase } from "@/lib/serverLocale";
import { homeMetadata, personalResultOgImage } from "@/lib/seo";
import { decodeUsInput } from "@/lib/usInput";
import {
  getContextualIncomePercentile,
  getNationalIncomePercentile,
  getNationalIncomePercentileForAgeBand,
  getStateIncome,
  getStateIncomePercentile,
} from "@/lib/usIncomeCalc";
import { getStateByAbbr } from "@/data/us/stateMeta";
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "@/components/us/ShieldShareCard";
import UsHomeClient from "./UsHomeClient";
import AdSlot from "@/components/ads/AdSlot";

type Params = { locale: string };
type SearchParams = Record<string, string | string[] | undefined>;

export function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }): Metadata {
  const locale = localeFromParams(params);
  const pathname = localeBase(locale);
  const rawInput = searchParams.d;
  const input = typeof rawInput === "string" ? decodeUsInput(rawInput) : null;
  const percentile = input ? getNationalIncomePercentile(input.annualIncome) : null;
  if (!input || percentile == null) return homeMetadata(locale, pathname);

  const stateCode = typeof searchParams.st === "string" ? searchParams.st : undefined;
  const state = stateCode ? getStateByAbbr(stateCode) : null;
  const agePercent = getNationalIncomePercentileForAgeBand(input.ageBand, input.annualIncome);
  const stateIncome = state ? getStateIncome(state.fips) : null;
  const statePercent =
    stateIncome != null
      ? getContextualIncomePercentile(
          stateIncome.percentileAnchors,
          stateIncome.medianHouseholdIncome,
          stateIncome.byMaritalStatus[input.maritalStatus],
          input.annualIncome
        ) ?? getStateIncomePercentile(stateIncome.fips, input.annualIncome)
      : null;
  const image = personalResultOgImage({
    percent: percentile,
    age: input.ageBand,
    agePercent: agePercent ?? undefined,
    state: state?.abbr,
    statePercent: statePercent ?? undefined,
  });
  const metadata = homeMetadata(locale, pathname);
  return {
    ...metadata,
    robots: { index: false, follow: true },
    openGraph: {
      ...metadata.openGraph,
      images: [{ url: image, width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT }],
    },
    twitter: { ...metadata.twitter, images: [image] },
  };
}

export default function UsPage() {
  const geo = getUsStatesGeo();
  return (
    <UsHomeClient
      geo={geo}
      // AdSlot is a Server Component (headers()-based production-host
      // check) — UsHomeClient is "use client" and can't import it directly,
      // so it's rendered here and threaded down as a prop instead, same
      // pattern as the state page's countyListAdSlot.
      adSlot={<AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME!} className="mb-8" />}
    />
  );
}
