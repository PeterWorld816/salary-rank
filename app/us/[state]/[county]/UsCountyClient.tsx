"use client";
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, Link2, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import { readUsInputFromSearch } from "@/components/us/UsInputPanel";
import { US_AGE_BANDS, US_GENDERS, US_MARITAL_STATUSES, decodeFriendChallenge, encodeFriendChallenge } from "@/lib/usInput";
import { buildResultHeadline } from "@/lib/narrative";
import { getTier } from "@/lib/tier";
import UsShell from "@/components/us/UsShell";
import UsInputPanel from "@/components/us/UsInputPanel";
import TierBadge from "@/components/us/TierBadge";
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
  getCountyGenderIncomeReference,
  getCountyMaritalIncomeReference,
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

// Wraps the detailed graphs/comparisons below the summary card — collapsed
// by default so the fold stays to the compact summary; expands in place.
// Controlled (open/onToggle) rather than owning its own state, since the
// share card preview below it needs to know the same open/closed flag.
function BreakdownAccordion({
  label, open, onToggle, children,
}: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3.5 text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399]/40 hover:text-white"
      >
        {label}
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-6">{children}</div>}
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
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [compareToast, setCompareToast] = useState<string | null>(null);
  const [compareCopied, setCompareCopied] = useState(false);
  const [compareFallbackUrl, setCompareFallbackUrl] = useState<string | null>(null);

  const input = readUsInputFromSearch(sp);
  const county = getCountyIncome(countyFips);
  const countyPercentile = getCountyIncomePercentile(countyFips, input.annualIncome);
  const nationalPercentile = getNationalIncomePercentile(input.annualIncome);
  const bothIncomeMissing = countyPercentile == null && nationalPercentile == null;

  const netWorthPercentile = getUsNetWorthPercentile(input.netWorth);
  const k401 = getK401Comparison(input.ageBand, input.k401);
  const ageBand = US_AGE_BANDS.find((b) => b.id === input.ageBand);
  const ageBandLabel = ageBand ? tr(ageBand.label) : input.ageBand;
  const genderLabel = tr(US_GENDERS.find((g) => g.id === input.gender)?.label ?? { ko: "", en: "" });
  const maritalLabel = tr(US_MARITAL_STATUSES.find((m) => m.id === input.maritalStatus)?.label ?? { ko: "", en: "" });

  // Regional reference values by gender/marital status (Census tables
  // B20017/B19126/B19215 — see lib/usIncomeCalc.ts) — each independently
  // falls back to the county's overall B19013 median when this county never
  // published (or couldn't reliably estimate) its own breakdown.
  const genderIncomeRef = getCountyGenderIncomeReference(countyFips, input.gender);
  const maritalIncomeRef = getCountyMaritalIncomeReference(countyFips, input.maritalStatus);

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
  const netWorthTier = getTier(netWorthPercentile);

  // The headline sentence and the big % below it must point at the exact
  // same metric — buildResultHeadline already picked the most impressive
  // scope, so its percentile (not heroPercent) drives both the number and
  // the tier badge, and its scope drives the small "Top in ..." label.
  const headlineResult = buildResultHeadline({
    countyPercentile,
    nationwidePercentile: nationalPercentile,
    agePercentile: ageIncomePercentile,
    netWorthPercentile,
    countyName,
    ageBandLabel,
  });
  const headline = headlineResult?.text ?? null;
  const headlinePercent = headlineResult?.percentile ?? null;
  const headlineTier = headlinePercent != null ? getTier(headlinePercent) : null;
  const headlineLabel = (() => {
    switch (headlineResult?.scope) {
      case "county":
        return formatTemplate(t.usHeadlineCountyLabelTemplate, { county: countyName });
      case "nationwide":
        return t.usNationalPercentileHeroLabel;
      case "age":
        return formatTemplate(t.usAgeIncomePercentileHeroLabel, { age: ageBandLabel });
      case "netWorth":
        return t.usNetWorthHeroLabel;
      default:
        return null;
    }
  })();
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

  // Deliberately does NOT try navigator.share() first: on real desktop
  // Chrome/Edge it exists but opens the OS-level share sheet, and if that
  // promise doesn't settle (user picks nothing, or the sheet misbehaves)
  // the whole handler just hangs — which is exactly the "button does
  // nothing" bug this was rewritten to fix. This is a copy-a-link action,
  // so it goes straight to the clipboard with guaranteed visible feedback
  // either way, plus a manual-copy fallback if the clipboard write fails.
  async function handleCompare() {
    if (heroPercent == null) return;
    const challenge = encodeFriendChallenge({ percentile: heroPercent, stateAbbr: state.abbr, countyFips });
    const params = new URLSearchParams(sp.toString());
    params.set("from", challenge);
    const compareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    // eslint-disable-next-line no-console -- intentional: lets anyone verify
    // the &from= param actually made it into the generated link.
    console.log("[compare-with-a-friend] challenge link:", compareUrl);

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(compareUrl);
      setCompareFallbackUrl(null);
      setCompareToast(t.copied);
      setCompareCopied(true);
      setTimeout(() => setCompareCopied(false), 2000);
    } catch {
      setCompareFallbackUrl(compareUrl);
      setCompareToast(t.shareFailed);
    } finally {
      setTimeout(() => setCompareToast(null), 2800);
    }
  }

  return (
    <UsShell>
      <UsInputPanel collapsible />

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
          className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.usBackToStateMap}
        </Link>

        {/* ── Summary card — the whole result in one glance, no scrolling.
            Region name, income tier badge + headline, the big income top-%
            number, and the net worth tier badge + number: six things, one
            screen. Everything else lives behind the accordion below. ── */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-1 text-[12px] font-bold text-[#34D399]">{t.usCountyResultLabel}</p>
          <h1 className="mb-4 text-[20px] font-extrabold tracking-tight">
            {countyName}, {state.name}
          </h1>

          {bothIncomeMissing || headlineTier == null || headlinePercent == null ? (
            <NoDataCard title={t.usCountyNoDataTitle} desc={t.usCountyNoDataDesc} />
          ) : (
            <>
              {headline && (
                <div className="mb-3 flex items-start gap-2">
                  <TierBadge tier={headlineTier} className="mt-0.5 shrink-0" />
                  <p className="text-[15px] font-bold leading-snug text-white">{headline}</p>
                </div>
              )}
              <p className="text-center font-extrabold text-[#FBBF24]" style={{ fontSize: "48px", lineHeight: 1 }}>
                {headlinePercent}%
              </p>
              {headlineLabel && <p className="mt-1 text-center text-[11px] text-white/45">{headlineLabel}</p>}
            </>
          )}

          <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/10 pt-4">
            <TierBadge tier={netWorthTier} />
            <span className="font-extrabold text-[#34D399]" style={{ fontSize: "20px" }}>
              {netWorthPercentile}%
            </span>
            <span className="text-[11px] text-white/45">{t.usNetWorthHeroLabel}</span>
          </div>
        </div>

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

        <BreakdownAccordion
          label={`${t.usSeeFullBreakdown} ▾`}
          open={breakdownOpen}
          onToggle={() => setBreakdownOpen((v) => !v)}
        >
          <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-[12px] text-white/45">{t.usCountyMedianLabel}</p>
            <p className="text-[22px] font-bold tabular-nums text-white">
              {county?.medianHouseholdIncome ? formatUsd(county.medianHouseholdIncome) : "—"}
            </p>
            <p className="mt-1 text-[11px] text-white/30">{formatTemplate(t.usAcs5YearLabel, { range: acs5YearRange })}</p>

            {(genderIncomeRef?.value != null || maritalIncomeRef?.value != null) && (
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                {genderIncomeRef?.value != null && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/50">
                        {formatTemplate(t.usByGenderMedianLabelTemplate, { gender: genderLabel })}
                      </span>
                      <span className="text-[14px] font-bold tabular-nums text-white">{formatUsd(genderIncomeRef.value)}</span>
                    </div>
                    {genderIncomeRef.usedFallback && (
                      <p className="mt-0.5 text-[10px] text-white/35">{t.usRegionalDetailFallbackNote}</p>
                    )}
                  </div>
                )}
                {maritalIncomeRef?.value != null && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-white/50">
                        {formatTemplate(t.usByMaritalMedianLabelTemplate, { status: maritalLabel })}
                      </span>
                      <span className="text-[14px] font-bold tabular-nums text-white">{formatUsd(maritalIncomeRef.value)}</span>
                    </div>
                    {maritalIncomeRef.usedFallback && (
                      <p className="mt-0.5 text-[10px] text-white/35">{t.usRegionalDetailFallbackNote}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!bothIncomeMissing && (
            <div className="mb-8">
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
          <div className="rounded-lg bg-white/[0.03] px-4 py-3 text-center">
            <p className="text-[12px] text-white/40">{formatTemplate(t.usSourceCensus, { range: acs5YearRange })}</p>
            <p className="mt-1 text-[12px] text-white/40">{t.usSourceScf}</p>
            <p className="mt-1 text-[12px] text-white/40">{t.usSourceVanguard}</p>
            <p className="mt-2 text-[12px] text-white/25">{t.usDisclaimer}</p>
          </div>
        </BreakdownAccordion>

        {/* ── Share card preview — kept mounted at all times (ShareButtons'
            "Save Image" reads cardRef straight off it), just visually
            collapsed to zero height until the breakdown is open. That keeps
            first paint scroll-free: summary card, badges, then the Share/
            Save buttons below, with no giant image forcing a scroll. ── */}
        <div className={breakdownOpen ? "mb-6 flex justify-center" : "h-0 overflow-hidden"} aria-hidden={!breakdownOpen}>
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
            {compareCopied ? t.usCompareCopiedShort : t.usCompareButton}
          </button>
          {compareFallbackUrl && (
            <div className="mt-2 rounded-md border border-white/15 bg-white/[0.04] p-3">
              <p className="mb-2 text-[12px] text-white/60">{t.usCompareCopyFailedHelper}</p>
              <input
                type="text"
                readOnly
                value={compareFallbackUrl}
                autoFocus
                onFocus={(e) => e.currentTarget.select()}
                className="w-full rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-[12px] text-white outline-none focus:border-[#34D399]"
              />
            </div>
          )}
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
