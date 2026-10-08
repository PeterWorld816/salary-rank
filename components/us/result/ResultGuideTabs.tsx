"use client";
// The three tabs under the result card — "Your result" (what the number
// means, against which groups), "What moves you" (reference cutoffs and
// medians, no advice), and "What if?" (an income slider). Mounted by both
// CompactResultCard.tsx (home/state/county) and PersonalizedResult.tsx
// (place + standalone), which pass in the same percent their card shows so
// the line-up sentence can't disagree with it. All math lives in
// lib/resultGuide.ts; only the active tab's panel is mounted, and clicking
// the open tab collapses it so the default page stays short.
//
// Nothing here touches the URL — slider/typed values live in component
// state only.
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import type { LangCode } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import type { StateMeta } from "@/data/us/stateMeta";
import { getStateIncome, type UsCountyIncome, type UsPlaceIncome } from "@/lib/usIncomeCalc";
import type { UsAgeBandId, UsInput } from "@/lib/usInput";
import {
  fetchStateOccupationData,
  getOccupationCategory,
  getOccupationIncomeAnchors,
  getOccupationMedianIncome,
  occupationAgeBucket,
  occupationSexCode,
  type StateOccupationFile,
} from "@/lib/usOccupationIncome";
import { getReceiptGrade, receiptRankFromPercent } from "@/lib/receiptCard";
import { getOccupationDetail } from "@/lib/usEarningsDetail";
import Link from "next/link";
import occupationPages from "@/data/seo/occupationPages.json";

// Detailed occupations that have a public /us/occupations/<slug> page.
const OCCUPATION_PAGE_SLUG = new Map(occupationPages.pages.map((p) => [p.id, { slug: p.slug, name: p.name }]));
import { useDetailedEarnings } from "@/components/us/result/useDetailedEarnings";
import {
  GUIDE_MILESTONES,
  ageBandLabel,
  buildAgeCurve,
  buildCaveats,
  buildComparisonRows,
  buildCutoffTable,
  buildGlanceSentence,
  buildGuideScopes,
  buildMilestoneSteps,
  buildNetWorthGuide,
  buildStateStandings,
  crossedMilestone,
  headlineWhere,
  lookupDisplayPercent,
  medianDistancePhrase,
  milestoneSentence,
  scopeCutoff,
  scopePercent,
  stateSpreadSentence,
  topOneSentence,
  type GuideContext,
  type GuideOccupation,
  type GuideScopes,
  type HeadlineKey,
  type IncomeScopeKey,
  type RankScope,
} from "@/lib/resultGuide";

const L = (lang: LangCode, ko: string, en: string) => (lang === "ko" ? ko : en);

const OCC_BUCKET_TO_AGE: Record<string, UsAgeBandId> = {
  "25-34": "25-34",
  "35-44": "35-44",
  "45-54": "45-54",
  "55-64": "55-64",
  "65-99": "65plus",
};

// Occupation curve for the visitor's occupation/age/sex — the state file
// (fetched on demand, cached by lib/usOccupationIncome.ts) when a state is
// in view, else the bundled nationwide combos.
function useGuideOccupation(input: UsInput, state: StateMeta | null, lang: LangCode): { occupation: GuideOccupation | null; selected: boolean; unavailable: boolean } {
  const category = getOccupationCategory(input.occupation);
  const bucket = occupationAgeBucket(input.ageBand);
  const [stateData, setStateData] = useState<StateOccupationFile | null>(null);
  const [loaded, setLoaded] = useState(!state);
  useEffect(() => {
    setStateData(null);
    setLoaded(!state);
    if (!category || !state) return;
    let cancelled = false;
    fetchStateOccupationData(state.abbr).then((d) => {
      if (cancelled) return;
      setStateData(d);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [category?.id, state?.abbr]); // eslint-disable-line react-hooks/exhaustive-deps

  const occupation = useMemo(() => {
    if (!category || !bucket || !loaded) return null;
    const sex = occupationSexCode(input.gender);
    const result = getOccupationIncomeAnchors(category.id, bucket, sex, state ? stateData : null);
    if (!result) return null;
    const medianByAge = Object.entries(OCC_BUCKET_TO_AGE)
      .map(([b, ageBand]) => ({ ageBand, median: getOccupationMedianIncome(category.id, b, sex, null)?.value ?? null }))
      .filter((p): p is { ageBand: UsAgeBandId; median: number } => p.median != null);
    return {
      label: category.label[lang],
      anchors: result.anchors,
      // Without a state in view the nationwide combo IS the intended basis,
      // not a fallback from anything.
      usedFallback: state ? result.usedFallback : false,
      medianByAge,
    };
  }, [category, bucket, loaded, input.gender, state, stateData, lang]);

  return { occupation, selected: Boolean(category), unavailable: Boolean(category) && !bucket };
}

type TabId = "result" | "moves" | "whatif";

export default function ResultGuideTabs({
  input,
  headlineKey,
  headlinePercent,
  incomeKey,
  state,
  county = null,
  place = null,
  countyName = null,
  placeName = null,
}: {
  input: UsInput;
  // The scope + percent the result card above is showing, verbatim.
  headlineKey: HeadlineKey;
  headlinePercent: number;
  // The location scope the card's income number is measured in — what the
  // cutoffs and the slider use.
  incomeKey: IncomeScopeKey;
  state: StateMeta | null;
  county?: UsCountyIncome | null;
  place?: UsPlaceIncome | null;
  countyName?: string | null;
  placeName?: string | null;
}) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<TabId | null>("result");
  const { occupation: majorOccupation, selected: occupationSelected, unavailable: occupationUnavailable } = useGuideOccupation(input, state, lang);
  const { rows: extraRows, detailMedianByAge } = useDetailedEarnings(input, state);
  // A detailed occupation's own per-age medians replace the major group's
  // on the age curve.
  const occupation = useMemo(() => {
    const detail = getOccupationDetail(input.occupationDetail);
    if (!detail || !detailMedianByAge || detailMedianByAge.length < 2) return majorOccupation;
    return {
      label: detail.label[lang],
      anchors: majorOccupation?.anchors ?? [],
      usedFallback: majorOccupation?.usedFallback ?? false,
      medianByAge: detailMedianByAge,
    };
  }, [majorOccupation, detailMedianByAge, input.occupationDetail, lang]);

  const ctx: GuideContext = useMemo(
    () => ({
      lang,
      input,
      state,
      stateIncome: state ? getStateIncome(state.fips) : null,
      county,
      place,
      countyName,
      placeName,
      occupation,
      extraRows,
    }),
    [lang, input, state, county, place, countyName, placeName, occupation, extraRows]
  );
  const scopes = useMemo(() => buildGuideScopes(ctx), [ctx]);
  const incomeScope = scopes[incomeKey] ?? scopes.county ?? scopes.state ?? scopes.national!;

  const tabs: { id: TabId; label: string }[] = [
    { id: "result", label: L(lang, "내 결과", "Your result") },
    { id: "moves", label: L(lang, "다음 단계", "What moves you") },
    { id: "whatif", label: L(lang, "만약에?", "What if?") },
  ];

  return (
    <div className="mx-auto mt-4 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.02]">
      <div role="tablist" aria-label={L(lang, "결과 해설", "Result guide")} className="flex gap-1 p-1.5">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`guide-tab-${t.id}`}
              aria-selected={active}
              aria-expanded={active}
              aria-controls={`guide-panel-${t.id}`}
              onClick={() => setTab(active ? null : t.id)}
              className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1.5 py-2 text-[12px] font-semibold transition-colors sm:text-[12.5px] ${
                active ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {t.label}
              <ChevronDown className={`hidden h-3.5 w-3.5 shrink-0 transition-transform sm:inline ${active ? "rotate-180" : ""}`} />
            </button>
          );
        })}
      </div>
      {tab && (
        <div role="tabpanel" id={`guide-panel-${tab}`} aria-labelledby={`guide-tab-${tab}`} className="border-t border-white/[0.06] px-4 pb-4 pt-3">
          {tab === "result" && (
            <YourResultPanel ctx={ctx} scopes={scopes} incomeScope={incomeScope} headlineKey={headlineKey} headlinePercent={headlinePercent} />
          )}
          {tab === "moves" && (
            <WhatMovesPanel
              ctx={ctx}
              scopes={scopes}
              incomeScope={incomeScope}
              occupationSelected={occupationSelected}
              occupationUnavailable={occupationUnavailable}
            />
          )}
          {tab === "whatif" && <WhatIfPanel ctx={ctx} scopes={scopes} incomeScope={incomeScope} />}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-white/40 first:mt-0">{children}</h3>;
}

// ── Tab 1 ─────────────────────────────────────────────────────────────────

function YourResultPanel({
  ctx,
  scopes,
  incomeScope,
  headlineKey,
  headlinePercent,
}: {
  ctx: GuideContext;
  scopes: GuideScopes;
  incomeScope: RankScope;
  headlineKey: HeadlineKey;
  headlinePercent: number;
}) {
  const { lang, input } = ctx;
  const income = input.annualIncome;
  const rows = useMemo(() => buildComparisonRows(scopes, income), [scopes, income]);
  const curve = useMemo(() => buildAgeCurve(ctx), [ctx]);
  const caveats = useMemo(() => buildCaveats(ctx, Boolean(scopes.occupation)), [ctx, scopes.occupation]);
  const maxMedian = Math.max(...curve.points.map((p) => p.median));

  return (
    <div>
      <p className="text-[14px] font-semibold leading-snug text-white">
        {buildGlanceSentence(headlinePercent, headlineWhere(headlineKey, scopes, ctx), lang)}
      </p>
      {incomeScope.median != null && (
        <p className="mt-2 text-[13px] leading-relaxed text-white/70">
          {L(
            lang,
            `${incomeScope.where} 중위값은 ${formatUsd(incomeScope.median)}이고, 당신의 ${formatUsd(income)}은 ${medianDistancePhrase(income, incomeScope.median, lang)}.`,
            `The median ${incomeScope.where.replace(/^among /, "for ")} is ${formatUsd(incomeScope.median)}; your ${formatUsd(income)} is ${medianDistancePhrase(income, incomeScope.median, lang)}.`
          )}
        </p>
      )}

      <SectionTitle>{L(lang, "비교 대상별 위치", "Where you stand, by group")}</SectionTitle>
      <ul className="divide-y divide-white/[0.06]">
        {rows.map((r) => (
          <li key={r.key} className="flex items-start justify-between gap-3 py-1.5">
            <div className="min-w-0 leading-tight">
              <p className="text-[12.5px] text-white/80">{r.label}</p>
              {r.note && <p className="mt-0.5 text-[10.5px] text-white/35">{r.note}</p>}
            </div>
            <div className="shrink-0 text-right leading-tight">
              <p className="text-[13px] font-bold text-white">{L(lang, `상위 ${r.percent}%`, `Top ${r.percent}%`)}</p>
              {r.ratio != null && r.median != null && (
                <p className="text-[10.5px] text-white/40">
                  {L(lang, `중위 ${formatUsd(r.median)}의 ${r.ratio.toFixed(2)}배`, `${r.ratio.toFixed(2)}× median ${formatUsd(r.median)}`)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <SectionTitle>{L(lang, "나이 곡선에서의 위치", "On the age curve")}</SectionTitle>
      <p className="text-[12px] leading-relaxed text-white/65">{curve.sentence}</p>

      {/* Bars + caveats stay folded so the default-open tab stays short. */}
      <details className="group mt-3 rounded-lg bg-white/[0.03] px-3 py-2">
        <summary className="cursor-pointer list-none text-[12px] font-semibold text-white/60">
          {L(lang, "나이 곡선 · 이 숫자를 해석할 때 주의할 점", "Age curve · reading these numbers")}
          <ChevronDown className="ml-1 inline h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <p className="mb-2 mt-3 text-[10.5px] font-semibold text-white/45">{curve.title}</p>
        <div className="flex items-end gap-1.5" aria-hidden="true">
          {curve.points.map((p) => (
            <div key={p.ageBand} className="flex min-w-0 flex-1 flex-col items-center">
              <span className={`mb-1 text-[9.5px] ${p.mine ? "font-bold text-[#34D399]" : "text-white/40"}`}>
                {Math.round(p.median / 1000)}K
              </span>
              <div
                className={`w-full rounded-t ${p.mine ? "bg-[#34D399]" : "bg-white/15"}`}
                style={{ height: `${Math.max(6, Math.round((p.median / maxMedian) * 40))}px` }}
              />
              <span className={`mt-1 truncate text-[9.5px] ${p.mine ? "font-bold text-[#34D399]" : "text-white/40"}`}>{p.label}</span>
            </div>
          ))}
        </div>
        {curve.sharedNote && <p className="mt-1.5 text-[10.5px] text-white/30">{curve.sharedNote}</p>}
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-white/[0.06] pt-2">
          {caveats.map((c, i) => (
            <li key={i} className="text-[11px] leading-relaxed text-white/50">
              {c}
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-3 text-[10.5px] text-white/30">
        {L(lang, "참고용 통계이며 재무 조언이 아닙니다.", "Reference statistics only — not financial advice.")}
      </p>
    </div>
  );
}

// ── Tab 2 ─────────────────────────────────────────────────────────────────

function WhatMovesPanel({
  ctx,
  scopes,
  incomeScope,
  occupationSelected,
  occupationUnavailable,
}: {
  ctx: GuideContext;
  scopes: GuideScopes;
  incomeScope: RankScope;
  occupationSelected: boolean;
  occupationUnavailable: boolean;
}) {
  const { lang, input } = ctx;
  const income = input.annualIncome;
  const steps = useMemo(() => buildMilestoneSteps(incomeScope, income), [incomeScope, income]);
  const standings = useMemo(() => buildStateStandings(input), [input]);
  const curve = useMemo(() => buildAgeCurve(ctx), [ctx]);
  const netWorth = useMemo(() => buildNetWorthGuide(ctx), [ctx]);
  const mineIndex = curve.points.findIndex((p) => p.mine);
  const later = mineIndex >= 0 ? curve.points.slice(mineIndex + 1) : [];
  const mine = mineIndex >= 0 ? curve.points[mineIndex] : null;
  const occ = scopes.occupationDetail ?? scopes.occupation;

  return (
    <div>
      <p className="mb-3 text-[11px] leading-relaxed text-white/40">
        {L(
          lang,
          "아래는 발표된 분포에서 읽어낸 참고 수치이며, 예측이 아닙니다.",
          "Reference values read off the published distributions — not projections."
        )}
      </p>

      <SectionTitle>{L(lang, "다음 구간까지", "Distance to the next markers")}</SectionTitle>
      {steps.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {steps.map((s) => (
            <li key={s.milestone} className="flex items-baseline justify-between gap-3 text-[12.5px]">
              <span className="text-white/70">{L(lang, `상위 ${s.milestone}%`, `Top ${s.milestone}%`)}</span>
              <span className="text-right text-white">
                {formatUsd(s.cutoff)} <span className="font-bold text-[#FBBF24]">+{formatUsd(s.gap)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px] text-white/70">{topOneSentence(incomeScope, income, lang)}</p>
      )}
      {steps[0] && <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/45">{milestoneSentence(steps[0], incomeScope, income, lang)}</p>}

      <SectionTitle>{L(lang, "다른 나이대의 같은 조건 중위값", "Medians at later ages")}</SectionTitle>
      {later.length > 0 && mine ? (
        <>
          <p className="mb-1.5 text-[11px] text-white/40">{curve.title}</p>
          <ul className="flex flex-col gap-1">
            {later.map((p) => {
              const diff = p.median - mine.median;
              return (
                <li key={p.ageBand} className="flex justify-between text-[12.5px]">
                  <span className="text-white/70">{L(lang, `${p.label} 중위`, `${p.label} median`)}</span>
                  <span className="text-white">
                    {formatUsd(p.median)}{" "}
                    <span className="text-[11px] text-white/40">
                      ({diff === 0 ? L(lang, "같은 값", "same figure") : `${diff > 0 ? "+" : "−"}${formatUsd(Math.abs(diff))}`})
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-[12.5px] text-white/60">
          {L(lang, `${ageBandLabel(input.ageBand, lang)}는 데이터의 마지막 나이대입니다.`, `${ageBandLabel(input.ageBand, lang)} is the last band in the data.`)}
        </p>
      )}

      <SectionTitle>{L(lang, "다른 주에서의 같은 소득", "The same income in other states")}</SectionTitle>
      <p className="mb-2 text-[12px] leading-relaxed text-white/65">{stateSpreadSentence(standings.best, standings.worst, income, lang)}</p>
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <p className="mb-1 text-[10.5px] text-white/40">{L(lang, "가장 높게 나오는 주", "Ranks highest in")}</p>
          {standings.best.map((s) => (
            <p key={s.abbr} className="flex justify-between text-white/80">
              <span className="truncate">{s.name}</span>
              <span className="ml-2 shrink-0 font-semibold">{L(lang, `상위 ${s.percent}%`, `Top ${s.percent}%`)}</span>
            </p>
          ))}
        </div>
        <div>
          <p className="mb-1 text-[10.5px] text-white/40">{L(lang, "가장 낮게 나오는 주", "Ranks lowest in")}</p>
          {standings.worst.map((s) => (
            <p key={s.abbr} className="flex justify-between text-white/80">
              <span className="truncate">{s.name}</span>
              <span className="ml-2 shrink-0 font-semibold">{L(lang, `상위 ${s.percent}%`, `Top ${s.percent}%`)}</span>
            </p>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[10.5px] text-white/30">
        {L(lang, "생활비·세금 차이는 반영되지 않은 순수 소득 분포 비교입니다.", "Income distributions only — cost of living and taxes are not reflected.")}
      </p>

      <SectionTitle>{L(lang, "직업 기준", "By occupation")}</SectionTitle>
      {occ && occ.median != null ? (
        <p className="text-[12.5px] leading-relaxed text-white/75">
          {L(
            lang,
            `${occ.where} 중위 근로소득은 ${formatUsd(occ.median)}이고, 당신의 ${formatUsd(income)}은 상위 ${scopePercent(occ, income)}% — ${medianDistancePhrase(income, occ.median, lang)}.`,
            `The median ${occ.where.replace(/^among /, "for ")} is ${formatUsd(occ.median)}; your ${formatUsd(income)} is Top ${scopePercent(occ, income)}% — ${medianDistancePhrase(income, occ.median, lang)}.`
          )}
          {occ.note && <span className="mt-0.5 block text-[10.5px] text-white/35">{occ.note}</span>}
          {(() => {
            const page = input.occupationDetail ? OCCUPATION_PAGE_SLUG.get(input.occupationDetail) : undefined;
            return page ? (
              <Link href={`/us/occupations/${page.slug}`} className="mt-1.5 block text-[12px] font-semibold text-[#34D399] underline-offset-2 hover:underline">
                {L(lang, `${page.name} 연봉 페이지 보기 (영문) →`, `See the ${page.name} salary page →`)}
              </Link>
            ) : null;
          })()}
        </p>
      ) : occupationUnavailable ? (
        <p className="text-[12.5px] text-white/60">
          {L(lang, "25세 미만은 직업별 소득 데이터가 없습니다.", "Occupation earnings data starts at age 25.")}
        </p>
      ) : occupationSelected ? (
        <p className="text-[12.5px] text-white/40">…</p>
      ) : (
        <p className="text-[12.5px] text-white/60">
          {L(lang, "직업을 선택하면 더 정확한 비교를 볼 수 있어요.", "Pick an occupation in the panel above for a closer comparison.")}
        </p>
      )}

      {netWorth && (
        <>
          <SectionTitle>{L(lang, "순자산 기준", "Net worth")}</SectionTitle>
          <p className="text-[12.5px] leading-relaxed text-white/75">{netWorth.sentence}</p>
        </>
      )}
    </div>
  );
}

// ── Tab 3 ─────────────────────────────────────────────────────────────────

const SLIDER_STEPS = 1000;
const GUESS_CHOICES = [1, 5, 10, 25, 50, 75];

function WhatIfPanel({ ctx, scopes, incomeScope }: { ctx: GuideContext; scopes: GuideScopes; incomeScope: RankScope }) {
  const { lang, input } = ctx;
  const base = input.annualIncome;
  const nationalScope = scopes.national!;

  // Precomputed once per scope — every slider frame is two binary searches.
  const tables = useMemo(
    () => ({ income: buildCutoffTable(incomeScope), national: buildCutoffTable(nationalScope) }),
    [incomeScope, nationalScope]
  );
  const maxIncome = useMemo(() => Math.max(base * 2, Math.ceil(scopeCutoff(incomeScope, 1) ?? 0)), [base, incomeScope]);
  const posToIncome = (pos: number) => Math.round((base * Math.pow(maxIncome / base, pos / SLIDER_STEPS)) / 100) * 100;
  const incomeToPos = (v: number) =>
    Math.round(Math.min(SLIDER_STEPS, Math.max(0, (Math.log(v / base) / Math.log(maxIncome / base)) * SLIDER_STEPS)));

  const [simIncome, setSimIncome] = useState(base);
  const [typed, setTyped] = useState(String(base));
  const [guessMode, setGuessMode] = useState(false);
  const [guess, setGuess] = useState<{ value: number; actual: number } | null>(null);
  const typedTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    setSimIncome(base);
    setTyped(String(base));
  }, [base]);
  useEffect(() => () => clearTimeout(typedTimer.current), []);

  const shown = useDeferredValue(simIncome);
  const currentPercent = scopePercent(incomeScope, base);
  const newPercent = shown === base ? currentPercent : lookupDisplayPercent(tables.income, shown);
  const nationalNow = scopePercent(nationalScope, base);
  const nationalNew = shown === base ? nationalNow : lookupDisplayPercent(tables.national, shown);
  const gradeNow = getReceiptGrade(receiptRankFromPercent(nationalNow)).label;
  const gradeNew = getReceiptGrade(receiptRankFromPercent(nationalNew)).label;
  const spots = currentPercent - newPercent;
  const crossed = crossedMilestone(currentPercent, newPercent);
  const raisePct = Math.round((shown / base - 1) * 100);
  const hidden = guessMode && guess == null;

  function onSlide(pos: number) {
    const v = posToIncome(pos);
    setSimIncome(v);
    setTyped(String(v));
  }
  function onType(raw: string) {
    setTyped(raw);
    clearTimeout(typedTimer.current);
    typedTimer.current = setTimeout(() => {
      const n = Number(raw.replace(/[^0-9.]/g, ""));
      if (Number.isFinite(n) && n > 0) setSimIncome(Math.round(n));
    }, 250);
  }

  return (
    <div>
      <p className="mb-3 text-[12px] leading-relaxed text-white/55">
        {L(
          lang,
          `소득만 바꿨을 때 ${incomeScope.where} 순위가 어떻게 달라지는지 봅니다. 다른 조건은 그대로입니다.`,
          `See how your rank ${incomeScope.where} shifts if only your income changes — everything else stays as entered.`
        )}
      </p>

      <label className="mb-1 flex items-center justify-between gap-3 text-[12px] text-white/60">
        <span>{L(lang, "연소득 (세전)", "Annual income (pre-tax)")}</span>
        <span className="flex items-center rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 focus-within:border-[#34D399]">
          <span className="text-white/40">$</span>
          <input
            type="text"
            inputMode="numeric"
            value={typed}
            onChange={(e) => onType(e.target.value)}
            aria-label={L(lang, "가정 소득 직접 입력", "Type a what-if income")}
            className="w-24 bg-transparent text-right text-[13px] font-semibold text-white outline-none"
          />
        </span>
      </label>
      <input
        type="range"
        min={0}
        max={SLIDER_STEPS}
        value={incomeToPos(simIncome)}
        onChange={(e) => onSlide(Number(e.target.value))}
        aria-label={L(lang, "가정 소득", "What-if income")}
        aria-valuetext={formatUsd(simIncome)}
        className="w-full accent-[#34D399]"
      />
      <div className="flex justify-between text-[10.5px] text-white/35">
        <span>{formatUsd(base)} (+0%)</span>
        <span>
          {formatUsd(maxIncome)} (+{Math.round((maxIncome / base - 1) * 100)}%)
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/[0.04] px-2 py-2">
          <p className="text-[10.5px] text-white/40">{L(lang, "가정 소득", "New income")}</p>
          <p className="text-[14px] font-bold text-white">{formatUsd(shown)}</p>
          <p className="text-[10.5px] text-white/40">{raisePct >= 0 ? `+${raisePct}%` : `${raisePct}%`}</p>
        </div>
        <div className="rounded-lg bg-white/[0.04] px-2 py-2">
          <p className="text-[10.5px] text-white/40">{L(lang, "새 순위", "New rank")}</p>
          <p className="text-[14px] font-bold text-white" aria-live="polite">
            {hidden ? "?" : L(lang, `상위 ${newPercent}%`, `Top ${newPercent}%`)}
          </p>
          <p className="text-[10.5px] text-white/40">
            {hidden ? "—" : spots > 0 ? L(lang, `+${spots}칸`, `+${spots} spots`) : spots < 0 ? L(lang, `${spots}칸`, `${spots} spots`) : L(lang, "변화 없음", "no change")}
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.04] px-2 py-2">
          <p className="text-[10.5px] text-white/40">{L(lang, "카드 등급", "Card grade")}</p>
          <p className="text-[14px] font-bold text-white">{hidden ? "?" : gradeNew}</p>
          <p className="text-[10.5px] text-white/40">{L(lang, `현재 ${gradeNow}`, `now ${gradeNow}`)}</p>
        </div>
      </div>

      <p className="mt-2 min-h-[18px] text-center text-[12px] font-semibold text-[#FBBF24]" aria-live="polite">
        {!hidden && crossed != null ? L(lang, `상위 ${crossed}% 선을 넘었어요`, `You crossed the Top ${crossed}% line`) : ""}
      </p>

      {/* Optional guessing game — only engages when asked. */}
      {!guessMode ? (
        <button
          type="button"
          onClick={() => {
            setGuessMode(true);
            setGuess(null);
          }}
          className="mt-1 w-full rounded-md border border-white/10 py-2 text-[12px] font-semibold text-white/60 transition-colors hover:border-[#34D399] hover:text-white"
        >
          {L(lang, "먼저 맞춰보기", "Guess first")}
        </button>
      ) : guess == null ? (
        <div className="mt-1 rounded-lg border border-white/10 p-3">
          <p className="mb-2 text-[12px] text-white/70">
            {L(lang, `${formatUsd(shown)}이면 ${incomeScope.where} 상위 몇 %일까요?`, `At ${formatUsd(shown)}, what Top % would you be ${incomeScope.where}?`)}
          </p>
          <div className="grid grid-cols-6 gap-1">
            {GUESS_CHOICES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGuess({ value: g, actual: newPercent })}
                className="rounded-md bg-white/[0.06] py-1.5 text-[12px] font-semibold text-white/80 hover:bg-white/[0.12]"
              >
                {g}%
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-1 rounded-lg border border-white/10 p-3 text-[12px] text-white/75">
          {L(lang, `예상 상위 ${guess.value}% → 실제 상위 ${guess.actual}%`, `You guessed Top ${guess.value}% → actually Top ${guess.actual}%`)}
          {" · "}
          {guess.value === guess.actual
            ? L(lang, "정확히 맞혔어요", "spot on")
            : L(lang, `${Math.abs(guess.value - guess.actual)}%p 차이`, `off by ${Math.abs(guess.value - guess.actual)} points`)}
          <button type="button" onClick={() => setGuessMode(false)} className="ml-2 text-white/40 underline hover:text-white/70">
            {L(lang, "닫기", "close")}
          </button>
        </div>
      )}

      <p className="mt-3 text-[10.5px] text-white/30">
        {L(
          lang,
          `기준선: ${GUIDE_MILESTONES.map((m) => `상위 ${m}%`).join(" · ")}. 같은 분포를 그대로 쓰며, 예측이 아닌 참고용입니다.`,
          `Markers: ${GUIDE_MILESTONES.map((m) => `Top ${m}%`).join(" · ")}. Same distribution as your card — a reference, not a projection.`
        )}
      </p>
    </div>
  );
}
