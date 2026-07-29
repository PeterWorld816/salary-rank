"use client";
import { Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import { readUsInputFromSearch } from "@/components/us/UsInputPanel";
import { US_AGE_BANDS } from "@/lib/usInput";
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
  nationalMedianHouseholdIncome,
  getUsNetWorthPercentile,
  overallUsNetWorth,
  getK401Comparison,
} from "@/lib/usIncomeCalc";

function HeroStat({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="text-center">
      <p className="mb-1 text-[13px] text-white/55">{label}</p>
      <p className="font-extrabold text-[#34D399]" style={{ fontSize: "56px", lineHeight: 1 }}>
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

  const input = readUsInputFromSearch(sp);
  const county = getCountyIncome(countyFips);
  const countyPercentile = getCountyIncomePercentile(countyFips, input.annualIncome);
  const nationalPercentile = getNationalIncomePercentile(input.annualIncome);
  const bothIncomeMissing = countyPercentile == null && nationalPercentile == null;

  const netWorthPercentile = getUsNetWorthPercentile(input.netWorth);
  const k401 = getK401Comparison(input.ageBand, input.k401);
  const ageBand = US_AGE_BANDS.find((b) => b.id === input.ageBand);
  const ageBandLabel = ageBand ? tr(ageBand.label) : input.ageBand;

  const heroPercent = countyPercentile ?? nationalPercentile;
  const shareTitle = `${t.usAppTitle} — ${countyName}, ${state.name}`;
  const shareText =
    heroPercent != null
      ? `${countyName}, ${state.name} · ${formatTemplate(t.topPercentTemplate, { percent: heroPercent })}`
      : `${countyName}, ${state.name}`;

  return (
    <UsShell>
      <UsInputPanel />

      <div className="mx-auto max-w-md px-6 pb-16 pt-10">
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
        </div>

        {bothIncomeMissing ? (
          <div className="mb-8">
            <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
          </div>
        ) : (
          <>
            {countyPercentile != null && (
              <div className="mb-8">
                <HeroStat label={t.usCountyPercentileHeroLabel} percent={countyPercentile} />
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

            {nationalPercentile != null && (
              <div className="mb-8">
                <HeroStat label={t.usNationalPercentileHeroLabel} percent={nationalPercentile} />
                <div className="mt-4 flex flex-col items-center rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <DistributionChart
                    monthlySalary={input.annualIncome}
                    width={260}
                    lang={lang}
                    dark
                    min={15000}
                    max={500000}
                    averageValue={nationalMedianHouseholdIncome ?? 75000}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Net worth (nationwide only) ── */}
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-white/90">{t.usNetWorthSectionTitle}</h2>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-white/50">
            {t.usNetWorthNationalBadge}
          </span>
        </div>
        <div className="mb-8">
          <HeroStat label={t.usNetWorthHeroLabel} percent={netWorthPercentile} />
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
          <p className="text-[12px] text-white/40">{t.usSourceCensus}</p>
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
              cardRef={cardRef}
              lang={lang}
            />
          </div>
        </div>

        <div className="mb-6">
          <ShareButtons
            cardRef={cardRef}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            shareTitle={shareTitle}
            shareText={shareText}
            downloadName={`us-income-${state.abbr}-${countyFips}.png`}
          />
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
