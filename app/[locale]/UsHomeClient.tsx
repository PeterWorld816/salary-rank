"use client";
import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FeatureCollection, Geometry } from "geojson";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import UsShell from "@/components/us/UsShell";
import UsMap, { type UsMapFeatureProps } from "@/components/us/UsMap";
import UsGeoList from "@/components/us/UsGeoList";
import IncomeLegend from "@/components/us/IncomeLegend";
import MapBasisControl from "@/components/us/MapBasisControl";
import {
  basisForLens,
  basisLabel,
  readMapBasisLensFromSearch,
  withMapBasisLens,
  type UsMapBasisLens,
} from "@/components/us/mapBasisLens";
import { readUsInputFromSearch } from "@/components/us/UsInputPanel";
import Footer from "@/components/us/Footer";
import Spinner from "@/components/Spinner";
import CompactResultCard from "@/components/us/result/CompactResultCard";
import CompactInsightSection from "@/components/us/result/CompactInsightSection";
import { getStateByFips } from "@/data/us/stateMeta";
import {
  getAllStateIncomes,
  resolveBasisIncome,
  resolveIncomeBasis,
  getAgeBandIncomeRatio,
  acs5YearRange,
  type UsIncomeReference,
} from "@/lib/usIncomeCalc";
import { incomeFill } from "@/components/us/colorScale";
import { formatUsd } from "@/lib/usFormat";
import { getOccupationCategory, occupationAgeBucket, occupationSexCode } from "@/lib/usOccupationIncome";
import { useOccupationMapData } from "@/components/us/useOccupationMapData";
import { US_AGE_BANDS } from "@/lib/usInput";

function UsHomeContent({
  geo,
  adSlot,
}: {
  geo: FeatureCollection<Geometry, UsMapFeatureProps>;
  adSlot?: React.ReactNode;
}) {
  const { t, tr } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString();
  const base = useLocaleBase();

  // Same contract as the state page (app/[locale]/[state]/UsStateClient.tsx):
  // the lens and the visitor's answers are read from the query string
  // *client-side*, never from a server `searchParams` prop. This route is
  // statically rendered (see the locale-from-URL change in page.tsx), and a
  // server-side searchParams read anywhere in the tree would force
  // per-request rendering and drop that prerender. The useSearchParams call
  // is safe here only because UsHomeClient below wraps this subtree in a
  // Suspense boundary.
  const input = useMemo(() => readUsInputFromSearch(sp), [sp]);
  // Passing `input` lets a missing "?lens=" default to "personalized" the
  // moment the visitor's answers already differ from DEFAULT_US_INPUT (a
  // shared result link, a refresh, Back) instead of always landing on the
  // plain household/marital view — see readMapBasisLensFromSearch's comment.
  const rawLens = readMapBasisLensFromSearch(sp, input);

  // The occupation the visitor picked in the input panel (if any) — this is
  // the only map that ever shades by it, since state-level is as fine-
  // grained as occupation data gets (see lib/usOccupationIncome.ts).
  const occupationCategory = getOccupationCategory(input.occupation);
  const occAgeBucket = occupationAgeBucket(input.ageBand);
  const occSex = occupationSexCode(input.gender);
  const occupationMapData = useOccupationMapData(occupationCategory?.id ?? null, occAgeBucket, occSex);

  // "?lens=occupation" only means anything while an occupation is actually
  // selected — a stale/shared URL with no occupation picked falls back to
  // whatever basisForLens resolves it to anyway, same as any other lens.
  const basisLens: UsMapBasisLens = rawLens === "occupation" && !occupationCategory ? "household" : rawLens;
  // "Personalized" and "occupation" both drive the map's fill from
  // occupationMapData once an occupation is selected — Personalized just
  // adds age band/marital status/gender on top when it isn't (see below).
  const usingOccupationFill = (basisLens === "occupation" || basisLens === "personalized") && Boolean(occupationCategory);
  const showingPersonalized = basisLens === "personalized";

  const basis = useMemo(
    () => basisForLens(basisLens, input.gender, input.maritalStatus),
    [basisLens, input.gender, input.maritalStatus]
  );

  // The household half of "Personalized" when no occupation is selected:
  // basisForLens can't resolve "personalized" itself (it isn't a
  // UsIncomeBasis axis — see mapBasisLens.ts), so this reaches straight for
  // resolveIncomeBasis with the visitor's actual gender/marital answers,
  // same priority rule (marital wins) as every other basis on this page.
  const personalizedHouseholdBasis = useMemo(
    () => resolveIncomeBasis(input.gender, input.maritalStatus),
    [input.gender, input.maritalStatus]
  );

  // No state-level income-by-age table exists (data/us/incomeByAge.json is
  // national-only), so age band folds into the household half of
  // Personalized as a ratio against the national median instead — see
  // getAgeBandIncomeRatio's comment in lib/usIncomeCalc.ts.
  const ageRatio = useMemo(() => getAgeBandIncomeRatio(input.ageBand), [input.ageBand]);

  const personalizedHouseholdByFips = useMemo(() => {
    const map = new Map<string, UsIncomeReference>();
    for (const s of getAllStateIncomes()) {
      const base = resolveBasisIncome(s, personalizedHouseholdBasis);
      map.set(s.fips, { value: base.value != null ? base.value * ageRatio : null, usedFallback: base.usedFallback });
    }
    return map;
  }, [personalizedHouseholdBasis, ageRatio]);

  const { min: persMin, max: persMax } = useMemo(() => {
    const values = [...personalizedHouseholdByFips.values()].map((r) => r.value).filter((v): v is number => v != null);
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 1 };
  }, [personalizedHouseholdByFips]);

  // Every state's figure under the current basis, resolved once per basis
  // change rather than per repaint — the fill callback runs for all 50+
  // geographies on every hover-driven re-render of UsMap. State rows carry
  // the same byGender/byMaritalStatus fields counties do, so
  // resolveBasisIncome takes them structurally (UsIncomeBreakdownSource).
  const referenceByFips = useMemo(
    () => new Map(getAllStateIncomes().map((s) => [s.fips, resolveBasisIncome(s, basis)])),
    [basis]
  );

  // Recomputed from the basis values, not from medianHouseholdIncome: gender
  // is *individual* median earnings and runs well below household income, so
  // reusing the household min/max would flatten the whole map into the bottom
  // band or two.
  const { min, max } = useMemo(() => {
    const values = [...referenceByFips.values()].map((r) => r.value).filter((v): v is number => v != null);
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 1 };
  }, [referenceByFips]);

  // Occupation median income per state — a wholly separate value scale from
  // the household/marital/gender one above (personal PERNP earnings, not
  // household income), so it needs its own min/max for the fill/legend to
  // make sense instead of being squashed onto the household scale.
  const { min: occMin, max: occMax } = useMemo(() => {
    const values = [...occupationMapData.byFips.values()].map((r) => r.value).filter((v): v is number => v != null);
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : { min: 0, max: 1 };
  }, [occupationMapData.byFips]);

  // Copies the whole current query string, so "?lens=" rides along to the
  // state page for free, same as "?d=" and "?lang=" already do — the state
  // page reads it back with the same readMapBasisLensFromSearch (and, for
  // "occupation" specifically, forces itself back to all-households — see
  // UsStateClient.tsx).
  function getHref(fips: string) {
    const state = getStateByFips(fips);
    if (!state) return base;
    return qs ? `${base}/${state.abbr}?${qs}` : `${base}/${state.abbr}`;
  }

  // Which reference map/scale is actually painting the choropleth right
  // now — three sources feed the same map depending on the active lens (and,
  // for "personalized", whether an occupation happens to be selected too):
  // occupation earnings, the household-scaled Personalized combination, or
  // the plain household/marital/gender basis. Centralized here so
  // getLabel/getFill/getFallback/stateItems below can't drift from each
  // other on which one is live.
  function activeReference(fips: string): UsIncomeReference | undefined {
    if (usingOccupationFill) return occupationMapData.byFips.get(fips);
    if (showingPersonalized) return personalizedHouseholdByFips.get(fips);
    return referenceByFips.get(fips);
  }
  const activeMin = usingOccupationFill ? occMin : showingPersonalized ? persMin : min;
  const activeMax = usingOccupationFill ? occMax : showingPersonalized ? persMax : max;

  function getLabel(fips: string) {
    const state = getStateByFips(fips);
    if (!state) return "";
    const reference = activeReference(fips);
    if (reference?.value == null) return state.name;
    const amount = usingOccupationFill
      ? `$${Math.round(reference.value).toLocaleString("en-US")}`
      : `$${reference.value.toLocaleString("en-US")}`;
    // Says so out loud when this state's shade came from the overall household
    // median (or, for occupation, the national figure) because the Census
    // never published the selected breakdown for it.
    const fallbackTooltip = usingOccupationFill ? t.usMapBasisOccupationFallbackTooltip : t.usMapBasisFallbackTooltip;
    return reference.usedFallback ? `${state.name} — ${amount} · ${fallbackTooltip}` : `${state.name} — ${amount}`;
  }

  function getFill(fips: string) {
    return incomeFill(activeReference(fips)?.value ?? null, activeMin, activeMax);
  }

  function getFallback(fips: string) {
    return usingOccupationFill && Boolean(activeReference(fips)?.usedFallback);
  }

  function handleSelect(fips: string) {
    router.push(getHref(fips));
  }

  // replace(), not push(): the lens is a view toggle on the page you're
  // already on, so each flip overwrites the current history entry rather than
  // stacking one — otherwise Back would walk the visitor through every shading
  // they tried. usePathname() rather than the /us|/kr `base` so /kr visitors
  // stay on /kr.
  function handleLensChange(next: UsMapBasisLens) {
    router.replace(`${pathname}?${withMapBasisLens(sp, next).toString()}`, { scroll: false });
  }

  // Same basis as the map beside it — a sidebar quoting household medians next
  // to a map shaded by individual earnings would read as two contradictory
  // numbers for the same state.
  const stateItems = geo.features
    .map((f) => {
      const fips = String(f.id);
      const state = getStateByFips(fips);
      if (!state) return null;
      const value = activeReference(fips)?.value ?? null;
      return { id: fips, name: state.name, sub: value != null ? formatUsd(value) : undefined };
    })
    .filter((s): s is { id: string; name: string; sub: string | undefined } => s != null);

  // "Personalized" tab label + descriptive line, composed here (not inside
  // MapBasisControl) since it reaches into pieces that component doesn't
  // otherwise need — occupation, age band, and whichever household basis
  // resolveIncomeBasis picked for the current gender/marital answers.
  // Always offered (unlike occupationOption) since age/marital/gender alone,
  // with no occupation selected, is enough to make Personalized meaningful.
  const ageBandLabel = tr(US_AGE_BANDS.find((b) => b.id === input.ageBand)?.label ?? { ko: "", en: "" });
  const personalizedOption = occupationCategory
    ? {
        tabLabel: t.usMapBasisOptionPersonalized,
        metric: t.usMapBasisMetricIndividual,
        group: `${tr(occupationCategory.label)} · ${ageBandLabel}`,
      }
    : {
        tabLabel: t.usMapBasisOptionPersonalized,
        metric: basisLabel(personalizedHouseholdBasis, t, tr).metric,
        group: `${basisLabel(personalizedHouseholdBasis, t, tr).group} · ${ageBandLabel}`,
      };

  return (
    <UsShell>
      <CompactResultCard presetState={null} presetCounty={null} />

      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="mb-2 text-[28px] font-extrabold tracking-tight text-balance">{t.usAppTitle}</h1>
        <p className="mb-8 max-w-xl text-[15px] text-white/55">{t.usTagline}</p>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold text-white/90">{t.usMapTitle}</h2>
          <span className="text-[12px] text-white/40">{t.usMapHint}</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
          <MapBasisControl
            lens={basisLens}
            onLensChange={handleLensChange}
            basis={basis}
            gender={input.gender}
            maritalStatus={input.maritalStatus}
            occupationOption={
              occupationCategory
                ? { label: formatTemplate(t.usMapBasisOptionOccupationTemplate, { occupation: tr(occupationCategory.label) }) }
                : null
            }
            personalizedOption={personalizedOption}
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <div className="relative">
                <UsMap
                  geo={geo}
                  onSelect={handleSelect}
                  getFill={getFill}
                  getLabel={getLabel}
                  getFallback={getFallback}
                  height={480}
                  zoomable
                />
                {/* Occupation/Personalized fetch every state's occupation
                    file the first time either is activated (see
                    useOccupationMapData.ts) — a visible overlay here, not
                    just a small text line above the map, is what keeps that
                    stretch from reading as a hung page instead of a loading
                    one. */}
                {usingOccupationFill && occupationMapData.loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#050607]/60 backdrop-blur-[1px]">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#050607]/90 px-4 py-2">
                      <Spinner className="h-4 w-4 border-2 border-white/20 border-t-[#34D399]" />
                      <span className="text-[12px] font-semibold text-white/80">{t.usMapBasisOccupationLoading}</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-[11px] text-white/35 sm:hidden">{t.usZoomHint}</p>
            </div>

            <div className="w-full shrink-0 sm:w-64">
              <UsGeoList
                items={stateItems}
                onSelect={handleSelect}
                searchPlaceholder={t.usSearchStatePlaceholder}
                emptyText={t.usListNoResults}
                maxHeight={480}
              />
            </div>
          </div>
          <IncomeLegend
            min={activeMin}
            max={activeMax}
            fallbackLabel={usingOccupationFill ? t.usMapBasisOccupationFallbackTooltip : null}
          />
        </div>

        <div className="mt-8">
          <CompactInsightSection presetState={null} presetCounty={null} />
        </div>

        <div className="mt-2 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{formatTemplate(t.usSourceCensus, { range: acs5YearRange })}</p>
          <p className="mt-1 text-[12px] text-white/30">{t.usDisclaimer}</p>
          <p className="mt-1 text-[12px] text-white/25">🔒 {t.privacyNotice}</p>
        </div>

        <div className="mt-8">{adSlot}</div>

        <Footer />
      </div>
    </UsShell>
  );
}

export default function UsHomeClient({
  geo,
  adSlot,
}: {
  geo: FeatureCollection<Geometry, UsMapFeatureProps>;
  adSlot?: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <UsShell>
          <div className="flex min-h-screen items-center justify-center">
            <Spinner className="h-8 w-8 border-[3px] border-white/20 border-t-[#34D399]" />
          </div>
        </UsShell>
      }
    >
      <UsHomeContent geo={geo} adSlot={adSlot} />
    </Suspense>
  );
}
