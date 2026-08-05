"use client";
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Link2, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import { readUsInputFromSearch } from "@/components/us/UsInputPanel";
import { US_AGE_BANDS, decodeFriendChallenge, encodeFriendChallenge } from "@/lib/usInput";
import { buildResultHeadline } from "@/lib/narrative";
import UsShell from "@/components/us/UsShell";
import UsInputPanel from "@/components/us/UsInputPanel";
import UsResultCard, { CARD_WIDTH, CARD_HEIGHT } from "@/components/us/UsResultCard";
import DistributionChart from "@/components/DistributionChart";
import ShareButtons from "@/components/ShareButtons";
import Spinner from "@/components/Spinner";
import type { StateMeta } from "@/data/us/stateMeta";
import {
  getCountyIncome,
  getCountyIncomePercentile,
  getNationalIncomePercentile,
  getNationalIncomePercentileForAgeBand,
  nationalMedianHouseholdIncome,
  getUsNetWorthPercentile,
  getUsNetWorthPercentileForAgeBand,
  overallUsNetWorth,
  getK401Comparison,
  acs5YearRange,
} from "@/lib/usIncomeCalc";

// Each section now shows 2-3 of these side by side (county/nationwide/same-
// age), so this stays small enough to fit three across app's max-w-md column.
function HeroStat({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="flex-1 text-center">
      <p className="mb-1 text-[11px] leading-tight text-white/55">{label}</p>
      {/* Gold, not mint — keeps the "this is you" number visually distinct
          from the green map/choropleth. */}
      <p className="font-extrabold text-[#FBBF24]" style={{ fontSize: "34px", lineHeight: 1 }}>
        {percent}%
      </p>
    </div>
  );
}

function NoDataCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center">
      <p className="mb-1 text-[14px] font-semibold text-white/70">{title}</p>
      <p className="text-[12px] text-white/40">{desc}</p>
    </div>
  );
}

function StatRow({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="text-[14px] font-medium text-white/85">{label}</div>
        {sub && <div className="text-[12px] text-white/40">{sub}</div>}
      </div>
      <div className="text-[16px] font-bold tabular-nums text-[#34D399]">{value}</div>
    </div>
  );
}

function UsCountyContent({
  state, countyFips, countyName,
}: { state: StateMeta; countyFips: string; countyName: string }) {
  const { t, tr, lang } = useLanguage();
  const sp = useSearchParams();
  const qs = sp.toString();
  const cardRef = useRef<HTMLDivElement>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [compareToast, setCompareToast] = useState<string | null>(null);

  const input = readUsInputFromSearch(sp);
  const county = getCountyIncome(countyFips);
  const countyPercentile = getCountyIncomePercentile(countyFips, input.annualIncome);
  const nationalPercentile = getNationalIncomePercentile(input.annualIncome);
  const bothIncomeMissing = countyPercentile == null && nationalPercentile == null;

  const netWorthPercentile = getUsNetWorthPercentile(input.netWorth);
  const k401 = getK401Comparison(input.ageBand, input.k401);
  const ageBand = US_AGE_BANDS.find((b) => b.id === input.ageBand);
  const ageBandLabel = ageBand ? tr(ageBand.label) : input.ageBand;

  const ageIncomePercentile = getNationalIncomePercentileForAgeBand(input.ageBand, input.annualIncome);
  const ageNetWorthPercentile = getUsNetWorthPercentileForAgeBand(input.ageBand, input.netWorth);
  const incomeHeroStats = [
    countyPercentile != null && { key: "county", label: t.usCountyPercentileHeroLabel, percent: countyPercentile },
    nationalPercentile != null && { key: "national", label: t.usNationalPercentileHeroLabel, percent: nationalPercentile },
    ageIncomePercentile != null && {
      key: "age",
      label: formatTemplate(t.usAgeIncomePercentileHeroLabel, { age: ageBandLabel }),
      percent: ageIncomePercentile,
    },
  ].filter((s): s is { key: string; label: string; percent: number } => Boolean(s));

  const heroPercent = countyPercentile ?? nationalPercentile;
  const headline = buildResultHeadline({
    countyPercentile,
    nationwidePercentile: nationalPercentile,
    agePercentile: ageIncomePercentile,
    netWorthPercentile,
    countyName,
    ageBandLabel,
  });
  const shareTitle = `${t.usAppTitle} — ${countyName}, ${state.name}`;
  const shareText =
    heroPercent != null
      ? `${countyName}, ${state.name} · ${formatTemplate(t.topPercentTemplate, { percent: heroPercent })}`
      : `${countyName}, ${state.name}`;

  // "Compare with a friend" — decode whatever challenge snapshot the current
  // URL carries (arrived via a friend's share link), and build a fresh one
  // from the current viewer's own result for a new challenge link.
  const friendChallenge = decodeFriendChallenge(sp.get("from") ?? "");
  const friendCounty = friendChallenge ? getCountyIncome(friendChallenge.countyFips) : null;
  const friendPlaceName = friendChallenge ? friendCounty?.name ?? friendChallenge.stateAbbr.toUpperCase() : null;
  const friendOutEarnsPercent = friendChallenge ? Math.max(1, Math.min(99, 100 - friendChallenge.percentile)) : null;

  async function handleCompare() {
    if (heroPercent == null || typeof window === "undefined") return;
    const challenge = encodeFriendChallenge({ percentile: heroPercent, stateAbbr: state.abbr, countyFips });
    const params = new URLSearchParams(sp.toString());
    params.set("from", challenge);
    const compareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: compareUrl });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(compareUrl);
      setCompareToast(t.copied);
    } catch {
      setCompareToast(t.shareFailed);
    } finally {
      setTimeout(() => setCompareToast(null), 2800);
    }
  }

  return (
    <UsShell>
      <UsInputPanel />

      <div className="mx-auto max-w-md px-6 pb-16 pt-10">
        {friendChallenge && friendPlaceName && friendOutEarnsPercent != null && !bannerDismissed && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-4 py-3">
            <p className="text-[13px] leading-snug text-white/85">
              {formatTemplate(t.usFriendBannerTemplate, { percent: friendOutEarnsPercent, place: friendPlaceName })}
            </p>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label={t.usDismiss}
              className="shrink-0 rounded-full p-1 text-white/40 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Link
          href={qs ? `/us/${state.abbr}?${qs}` : `/us/${state.abbr}`}
          className="mb-8 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.usBackToStateMap}
        </Link>

        <p className="mb-1 text-[13px] font-bold text-[#34D399]">{t.usCountyResultLabel}</p>
        <h1 className="mb-6 text-[22px] font-extrabold tracking-tight">
          {countyName}, {state.name}
        </h1>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
          <p className="text-[12px] text-white/45">{t.usCountyMedianLabel}</p>
          <p className="text-[22px] font-bold tabular-nums text-white">
            {county?.medianHouseholdIncome ? formatUsd(county.medianHouseholdIncome) : "—"}
          </p>
          <p className="mt-1 text-[11px] text-white/30">{formatTemplate(t.usAcs5YearLabel, { range: acs5YearRange })}</p>
        </div>

        {bothIncomeMissing ? (
          <div className="mb-8">
            <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
          </div>
        ) : (
          <div className="mb-8">
            {/* Sentence-form headline — same numbers as the hero stats below,
                phrased to read well as a social-share caption. */}
            {headline && <p className="mb-4 text-[19px] font-extrabold leading-snug text-white">{headline}</p>}
            <div className="flex items-start justify-around gap-2">
              {incomeHeroStats.map((s) => (
                <HeroStat key={s.key} label={s.label} percent={s.percent} />
              ))}
            </div>
            <div className="mt-4 flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <DistributionChart
                monthlySalary={input.annualIncome}
                width={260}
                lang={lang}
                dark
                min={15000}
                max={500000}
                averageValue={county?.medianHouseholdIncome ?? nationalMedianHouseholdIncome ?? 75000}
              />
            </div>
          </div>
        )}

        {/* ── Compare with a friend (see lib/usInput.ts's FriendChallenge) ── */}
        {friendChallenge && heroPercent != null && (
          <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-4 text-[15px] font-bold text-white/90">{t.usCompareCardTitle}</h2>
            <div className="flex items-center justify-around gap-3">
              <div className="text-center">
                <p className="mb-1 text-[11px] text-white/55">{t.usCompareCardYou}</p>
                <p className="font-extrabold text-[#FBBF24]" style={{ fontSize: "32px", lineHeight: 1 }}>
                  {heroPercent}%
                </p>
              </div>
              <div className="text-[12px] font-semibold text-white/30">vs</div>
              <div className="text-center">
                <p className="mb-1 text-[11px] text-white/55">{t.usCompareCardFriend}</p>
                <p className="font-extrabold text-[#34D399]" style={{ fontSize: "32px", lineHeight: 1 }}>
                  {friendChallenge.percentile}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Net worth (nationwide only) ── */}
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-white/90">{t.usNetWorthSectionTitle}</h2>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white/50">
            {t.usNetWorthNationalBadge}
          </span>
        </div>
        <div className="mb-8">
          <div className="flex items-start justify-around gap-2">
            <HeroStat label={t.usNetWorthHeroLabel} percent={netWorthPercentile} />
            {ageNetWorthPercentile != null && (
              <HeroStat
                label={formatTemplate(t.usAgeNetWorthPercentileHeroLabel, { age: ageBandLabel })}
                percent={ageNetWorthPercentile}
              />
            )}
          </div>
          <div className="mt-4 flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <DistributionChart
              monthlySalary={input.netWorth}
              width={260}
              lang={lang}
              dark
              min={1000}
              max={15000000}
              averageValue={overallUsNetWorth.median}
            />
          </div>
        </div>

        {/* ── 401k comparison ── */}
        <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-[15px] font-bold text-white/90">{t.usK401SectionTitle}</h2>
          <p className="mb-3 text-[12px] text-white/40">{t.usK401Helper}</p>
          <div className="divide-y divide-white/[0.06]">
            <StatRow
              label={t.usFieldAgeBand}
              sub={ageBandLabel}
              value={formatUsd(input.k401)}
            />
            <StatRow
              label={formatTemplate(t.usK401VsAverageTemplate, { percent: k401.vsAveragePercent })}
              sub={`avg ${formatUsd(k401.average)}`}
              value={`${k401.vsAveragePercent}%`}
            />
            <StatRow
              label={formatTemplate(t.usK401VsMedianTemplate, { percent: k401.vsMedianPercent })}
              sub={`median ${formatUsd(k401.median)}`}
              value={`${k401.vsMedianPercent}%`}
            />
          </div>
        </div>

        {/* ── Place-level teaser (scaffolding only, see /us/[state]/[county]/[place]) ── */}
        <div className="mb-8 rounded-xl border border-dashed border-white/15 px-5 py-4 text-center">
          <p className="text-[12px] text-white/40">{t.usPlaceComingSoon}</p>
        </div>

        {/* ── Sources ── */}
        <div className="mb-8 rounded-lg bg-white/[0.03] px-4 py-3 text-center">
          <p className="text-[12px] text-white/40">{formatTemplate(t.usSourceCensus, { range: acs5YearRange })}</p>
          <p className="mt-1 text-[12px] text-white/40">{t.usSourceScf}</p>
          <p className="mt-1 text-[12px] text-white/40">{t.usSourceVanguard}</p>
          <p className="mt-2 text-[12px] text-white/25">{t.usDisclaimer}</p>
        </div>

        {/* ── Share card ── */}
        <div className="mb-6 flex justify-center">
          <div className="overflow-hidden rounded-3xl shadow-[0_12px_48px_rgba(0,0,0,0.5)]">
            <UsResultCard
              stateName={state.name}
              countyName={countyName}
              countyPercentile={countyPercentile}
              nationalPercentile={nationalPercentile}
              annualIncome={input.annualIncome}
              netWorthPercentile={netWorthPercentile}
              netWorth={input.netWorth}
              k401VsMedianPercent={k401.vsMedianPercent}
              ageBandLabel={ageBandLabel}
              ageIncomePercentile={ageIncomePercentile}
              ageNetWorthPercentile={ageNetWorthPercentile}
              cardRef={cardRef}
              lang={lang}
            />
          </div>
        </div>

        <div className="mb-3">
          <ShareButtons
            cardRef={cardRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            shareTitle={shareTitle}
            shareText={shareText}
            downloadName={`us-income-${state.abbr}-${countyFips}.png`}
          />
        </div>

        <div className="relative mb-6">
          {compareToast && (
            <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-5 py-3 text-[14px] font-semibold text-[#0D0D0D] shadow-lg">
              {compareToast}
            </div>
          )}
          <button
            type="button"
            onClick={handleCompare}
            disabled={heroPercent == null}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 py-3 text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Link2 className="h-4 w-4" />
            {t.usCompareButton}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={qs ? `/us/${state.abbr}?${qs}` : `/us/${state.abbr}`}
            className="rounded-md border border-white/15 py-3 text-center text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
          >
            {t.usBackToStateMap}
          </Link>
          <Link
            href={qs ? `/us?${qs}` : "/us"}
            className="rounded-md border border-white/15 py-3 text-center text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
          >
            {t.usBackToUsMap}
          </Link>
        </div>
      </div>
    </UsShell>
  );
}

export default function UsCountyClient(props: { state: StateMeta; countyFips: string; countyName: string }) {
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
      <UsCountyContent {...props} />
    </Suspense>
  );
}
