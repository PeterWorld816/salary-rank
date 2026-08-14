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
import { getAllStateIncomes, resolveBasisIncome, acs5YearRange } from "@/lib/usIncomeCalc";
import { incomeFill } from "@/components/us/colorScale";
import { formatUsd } from "@/lib/usFormat";

function UsHomeContent({
  geo,
  adSlot,
}: {
  geo: FeatureCollection<Geometry, UsMapFeatureProps>;
  adSlot?: React.ReactNode;
}) {
  const { t } = useLanguage();
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
  const basisLens = readMapBasisLensFromSearch(sp);
  const input = useMemo(() => readUsInputFromSearch(sp), [sp]);
  const basis = useMemo(
    () => basisForLens(basisLens, input.gender, input.maritalStatus),
    [basisLens, input.gender, input.maritalStatus]
  );

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

  // Copies the whole current query string, so "?lens=" rides along to the
  // state page for free, same as "?d=" and "?lang=" already do — the state
  // page reads it back with the same readMapBasisLensFromSearch.
  function getHref(fips: string) {
    const state = getStateByFips(fips);
    if (!state) return base;
    return qs ? `${base}/${state.abbr}?${qs}` : `${base}/${state.abbr}`;
  }

  function getLabel(fips: string) {
    const state = getStateByFips(fips);
    if (!state) return "";
    const reference = referenceByFips.get(fips);
    if (reference?.value == null) return state.name;
    const amount = `$${reference.value.toLocaleString("en-US")}`;
    // Says so out loud when this state's shade came from the overall household
    // median because the Census never published the selected breakdown for it.
    return reference.usedFallback ? `${state.name} — ${amount} · ${t.usMapBasisFallbackTooltip}` : `${state.name} — ${amount}`;
  }

  function getFill(fips: string) {
    return incomeFill(referenceByFips.get(fips)?.value ?? null, min, max);
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
      const value = referenceByFips.get(fips)?.value ?? null;
      return { id: fips, name: state.name, sub: value != null ? formatUsd(value) : undefined };
    })
    .filter((s): s is { id: string; name: string; sub: string | undefined } => s != null);

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

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 sm:p-4">
          <MapBasisControl
            lens={basisLens}
            onLensChange={handleLensChange}
            basis={basis}
            gender={input.gender}
            maritalStatus={input.maritalStatus}
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <UsMap geo={geo} onSelect={handleSelect} getFill={getFill} getLabel={getLabel} height={480} zoomable />
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
          <IncomeLegend min={min} max={max} />
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
