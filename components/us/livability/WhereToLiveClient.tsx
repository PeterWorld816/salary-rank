"use client";
// The /us/where-to-live tool: one income + a home size, scored in every US
// metro (lib/livability.ts) — summary first, then the state map, the ranked
// list, a two-metro comparison and the share button. The data file is
// fetched only here (public/data/livability.json), never bundled.
//
// Nothing here touches the URL: the income starts from the visitor's answer
// in the shared input state (UsInputContext) and stays in component state.
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import { ChevronDown, Search, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { useUsInput } from "@/components/us/UsInputContext";
import UsMap, { type UsMapFeatureProps } from "@/components/us/UsMap";
import { NO_DATA_FILL } from "@/components/us/colorScale";
import ShareButtons from "@/components/ShareButtons";
import Spinner from "@/components/Spinner";
import CountUpTemplate from "@/components/us/result/CountUpTemplate";
import LivabilityShareCard from "@/components/us/livability/LivabilityShareCard";
import { STORY_HEIGHT, STORY_WIDTH, WIDE_HEIGHT, WIDE_WIDTH } from "@/components/us/ShieldShareCard";
import { getStateByFips } from "@/data/us/stateMeta";
import { formatUsd } from "@/lib/usFormat";
import {
  GRADE_ORDER,
  areaSummary,
  comfortableOrBetterPercent,
  gradeDistribution,
  scoreAll,
  scoreArea,
  type AreaScore,
  type Bedrooms,
  type GradeId,
  type LivabilityData,
} from "@/lib/livability";
import { LIVABILITY_CONSTANTS } from "@/lib/livabilityConstants";
import { GRADE_LABELS } from "@/lib/livabilityGrades";

type Lang = "en" | "ko";
const L = (lang: Lang, ko: string, en: string) => (lang === "ko" ? ko : en);
const DEBOUNCE_MS = 400;
const DISCLAIMER = {
  en: "Estimate from pre-tax income and public medians — not financial advice.",
  ko: "세전 소득과 공개 중위값으로 만든 추정치이며 재무 조언이 아닙니다.",
};

function GradeChip({ grade, lang }: { grade: GradeId; lang: Lang }) {
  const g = GRADE_LABELS[grade];
  return (
    <span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11.5px] font-bold text-[#0B0F0D]" style={{ background: g.color }}>
      {g[lang]}
    </span>
  );
}

function flagText(flag: string, lang: Lang): string {
  const m = flag.match(/^(rent([123])|homeValue)-(topcoded|bottomcoded|na)$/);
  if (!m) return flag;
  const what = m[1] === "homeValue" ? L(lang, "중위 주택 가치", "Median home value") : L(lang, `${m[2]}침실 중위 월세`, `${m[2]}-bedroom median rent`);
  if (m[3] === "topcoded") return L(lang, `${what}: Census 상한값 이상(상한값으로 계산)`, `${what}: at or above the Census top value (scored at that value)`);
  if (m[3] === "bottomcoded") return L(lang, `${what}: Census 하한값 이하`, `${what}: at or below the Census bottom value`);
  return L(lang, `${what}: 표본 부족으로 값 없음`, `${what}: not published (sample too small)`);
}

// Income box: formats with commas as you type and hands the number up only
// after DEBOUNCE_MS without a keystroke. Follows `value` when it changes from
// outside (the seed from the shared input state).
const IncomeField = memo(function IncomeField({ value, onCommit, label }: { value: number; onCommit: (n: number) => void; label: string }) {
  const [typed, setTyped] = useState(() => value.toLocaleString("en-US"));
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    setTyped((cur) => (Number(cur.replace(/[^0-9]/g, "")) === value ? cur : value.toLocaleString("en-US")));
  }, [value]);
  function onChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 8);
    const n = Number(digits);
    setTyped(digits ? n.toLocaleString("en-US") : "");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (n >= 1000) onCommit(n);
    }, DEBOUNCE_MS);
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={typed}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-11 w-full min-w-0 bg-transparent pl-1 text-[18px] font-bold tabular-nums text-white outline-none"
    />
  );
});

export default function WhereToLiveClient({ geo }: { geo: FeatureCollection<Geometry, UsMapFeatureProps> }) {
  const { lang: rawLang } = useLanguage();
  const lang: Lang = rawLang === "ko" ? "ko" : "en";
  const { input, inputUrlCleaned } = useUsInput();

  const [data, setData] = useState<LivabilityData | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/livability.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: LivabilityData) => !cancelled && setData(d))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // The debounced income every score uses (IncomeField owns the typed text,
  // so keystrokes don't re-render the map and list).
  const [income, setIncome] = useState(input.annualIncome);
  const seeded = useRef(false);
  useEffect(() => {
    // A shared/edited answer from the input panel arrives once the context
    // has read it — seed from it then, unless the visitor already typed.
    if (!inputUrlCleaned || seeded.current) return;
    seeded.current = true;
    setIncome(input.annualIncome);
  }, [inputUrlCleaned, input.annualIncome]);
  const onCommitIncome = useCallback((n: number) => {
    seeded.current = true;
    setIncome(n);
  }, []);

  const [bedrooms, setBedrooms] = useState<Bedrooms>(LIVABILITY_CONSTANTS.defaultBedrooms);
  const metros = useMemo(() => data?.areas.filter((a) => a.type === "metro") ?? [], [data]);
  const scores = useMemo(() => scoreAll(metros, income, bedrooms), [metros, income, bedrooms]);
  const rankOf = useMemo(() => new Map(scores.map((s, i) => [s.area.id, i + 1])), [scores]);
  const dist = useMemo(() => gradeDistribution(scores), [scores]);
  const goodPercent = comfortableOrBetterPercent(scores);
  const stateScores = useMemo(() => {
    const m = new Map<string, AreaScore>();
    for (const a of data?.areas ?? []) {
      if (a.type !== "state") continue;
      const s = scoreArea(a, income, bedrooms);
      if (s) m.set(a.states[0], s);
    }
    return m;
  }, [data, income, bedrooms]);

  // ── Map → list filter ──
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  function onStateSelect(fips: string) {
    const st = getStateByFips(fips);
    if (!st) return;
    setStateFilter(st.abbr);
    setQuery("");
    setOpenId(null);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ── Ranked list ──
  const [mode, setMode] = useState<"best" | "hardest">("best");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const pool = stateFilter ? scores.filter((s) => s.area.states.includes(stateFilter)) : scores;
  const q = query.trim().toLowerCase();
  const rows = q
    ? pool.filter((s) => s.area.name.toLowerCase().includes(q)).slice(0, 30)
    : mode === "best"
      ? pool.slice(0, 10)
      : pool.slice(-10).reverse();
  const stateName = stateFilter ? (data?.areas.find((a) => a.type === "state" && a.states[0] === stateFilter)?.name ?? stateFilter) : null;

  // ── Compare ──
  const sortedMetros = useMemo(() => [...metros].sort((a, b) => a.name.localeCompare(b.name)), [metros]);
  const [cmpA, setCmpA] = useState("cbsa-41860");
  const [cmpB, setCmpB] = useState("cbsa-41700");
  const cmp = [cmpA, cmpB].map((id) => {
    const a = metros.find((m) => m.id === id);
    return a ? scoreArea(a, income, bedrooms) : null;
  });

  // ── Share ──
  const cardRef = useRef<HTMLDivElement>(null);
  const storyCardRef = useRef<HTMLDivElement>(null);
  const best = scores[0] ?? null;
  const ogParams = new URLSearchParams({ p: String(goodPercent) });
  if (best) {
    ogParams.set("a", best.area.slug);
    ogParams.set("g", best.grade);
  }
  const shareText = `My income lives Comfortable or better in ${goodPercent}% of US metros. Where can you live best?`;

  const bedroomOptions: { id: Bedrooms; label: string; sub: string }[] = [
    { id: 1, label: L(lang, "혼자", "Solo"), sub: L(lang, "1침실", "1 bed") },
    { id: 2, label: L(lang, "둘이서", "Couple"), sub: L(lang, "2침실", "2 beds") },
    { id: 3, label: L(lang, "가족", "Family"), sub: L(lang, "3침실", "3 beds") },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ── 1. Input: income + home size, nothing else ── */}
      <section aria-label={L(lang, "입력", "Your inputs")} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{L(lang, "연소득 (세전)", "Annual income (pre-tax)")}</span>
            <span className="flex items-center rounded-lg border border-white/15 bg-white/[0.05] px-3 focus-within:border-[#34D399]">
              <span className="text-[16px] text-white/45">$</span>
              <IncomeField value={income} onCommit={onCommitIncome} label={L(lang, "연소득 (세전)", "Annual income (pre-tax)")} />
            </span>
          </label>
          <div role="radiogroup" aria-label={L(lang, "거주 형태", "Household")} className="grid grid-cols-3 gap-1.5 sm:w-[300px]">
            {bedroomOptions.map((o) => {
              const active = o.id === bedrooms;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBedrooms(o.id)}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-[13px] font-semibold leading-tight transition-colors ${
                    active ? "bg-[#34D399] text-[#04120C]" : "border border-white/10 bg-white/[0.05] text-white/75 hover:border-white/25"
                  }`}
                >
                  {o.label}
                  <span className={`text-[11px] font-medium ${active ? "text-[#04120C]/75" : "text-white/45"}`}>{o.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {!data ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-white/55">
          {loadError ? L(lang, "데이터를 불러오지 못했어요. 새로고침해 주세요.", "Couldn't load the data. Please refresh.") : <Spinner className="h-5 w-5 border-2 border-white/20 border-t-[#34D399]" />}
        </div>
      ) : (
        <>
          {/* ── 2. Summary sentence + grade distribution ── */}
          <section aria-label={L(lang, "요약", "Summary")} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[17px] font-bold leading-snug text-white">
              {lang === "ko" ? (
                <>
                  이 소득이면 미국 대도시권 {scores.length}곳 중{" "}
                  <span className="text-[#34D399]">
                    <CountUpTemplate template="{percent}%" value={goodPercent} />
                  </span>
                  에서 여유 이상으로 살 수 있어요.
                </>
              ) : (
                <>
                  On this income you&apos;d live Comfortable or better in{" "}
                  <span className="text-[#34D399]">
                    <CountUpTemplate template="{percent}%" value={goodPercent} />
                  </span>{" "}
                  of {scores.length} US metros.
                </>
              )}
            </p>
            <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={GRADE_ORDER.map((g) => `${GRADE_LABELS[g][lang]} ${Math.round((dist[g] / Math.max(1, scores.length)) * 100)}%`).join(", ")}>
              {GRADE_ORDER.map((g) => (
                <span key={g} className="h-full transition-[width] duration-500 ease-out" style={{ width: `${(dist[g] / Math.max(1, scores.length)) * 100}%`, background: GRADE_LABELS[g].color }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-white/65">
              {GRADE_ORDER.map((g) => (
                <li key={g} className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GRADE_LABELS[g].color }} aria-hidden />
                  {GRADE_LABELS[g][lang]} <span className="tabular-nums text-white/45">{Math.round((dist[g] / Math.max(1, scores.length)) * 100)}%</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-white/40">{DISCLAIMER[lang]}</p>
            <p className="mt-1 text-[11px] text-white/35">
              {L(lang, "출처", "Sources")}: BEA Regional Price Parities {data.meta.vintages.rpp} ({L(lang, "발표", "released")} {data.meta.vintages.rppReleased}) · Census ACS{" "}
              {data.meta.vintages.acs5} 5-year B25031, B25077 · {L(lang, "내려받음", "downloaded")} {data.meta.generatedAt.slice(0, 10)}
            </p>
          </section>

          {/* ── 3. State map, shaded by each state's own LivingScore ── */}
          <section aria-label={L(lang, "주별 지도", "Map by state")} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
            <h2 className="mb-1 px-1 text-[14px] font-bold text-white/90">{L(lang, "주별로 보면", "By state")}</h2>
            <p className="mb-2 px-1 text-[12px] text-white/50">{L(lang, "주를 누르면 아래 목록이 그 주의 대도시권으로 바뀌어요.", "Tap a state to list its metros below.")}</p>
            <UsMap
              geo={geo}
              onSelect={onStateSelect}
              getFill={(fips) => {
                const st = getStateByFips(fips);
                const s = st ? stateScores.get(st.abbr) : undefined;
                return s ? GRADE_LABELS[s.grade].color : NO_DATA_FILL;
              }}
              getLabel={(fips) => {
                const st = getStateByFips(fips);
                const s = st ? stateScores.get(st.abbr) : undefined;
                return st ? (s ? `${st.name} — ${GRADE_LABELS[s.grade][lang]} (${Math.round(s.living)})` : st.name) : "";
              }}
              height={440}
              zoomable
            />
            {/* Legend, same strip-with-labels form as IncomeLegend. */}
            <ol className="mt-3 grid grid-cols-5 gap-x-px px-1" aria-label={L(lang, "범례", "Legend")}>
              {GRADE_ORDER.map((g) => (
                <li key={g} className="flex min-w-0 flex-col gap-1">
                  <span className="h-2.5 w-full" style={{ background: GRADE_LABELS[g].color }} aria-hidden />
                  <span className="truncate text-center text-[11px] text-white/70">{GRADE_LABELS[g][lang]}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-white/40">
              {L(lang, "주 전체의 중위 월세·주택 가치·물가 지수로 계산한 값이에요.", "Each state is scored on its statewide median rent, home value and price parity.")}
            </p>
          </section>

          {/* ── 4. Ranking ── */}
          <section ref={listRef} aria-label={L(lang, "대도시권 순위", "Metro ranking")} className="scroll-mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div role="tablist" className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
                {(["best", "hardest"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m && !q}
                    onClick={() => {
                      setMode(m);
                      setQuery("");
                      setOpenId(null);
                    }}
                    className={`min-h-9 rounded-lg px-3 text-[13px] font-semibold ${mode === m && !q ? "bg-white/[0.1] text-white" : "text-white/55 hover:text-white"}`}
                  >
                    {m === "best" ? L(lang, "여유 순 10", "Best 10") : L(lang, "빠듯한 순 10", "Hardest 10")}
                  </button>
                ))}
              </div>
              {stateFilter && (
                <button
                  type="button"
                  onClick={() => setStateFilter(null)}
                  className="flex min-h-9 items-center gap-1 rounded-full border border-[#34D399]/40 bg-[#34D399]/10 px-3 text-[12.5px] font-semibold text-white"
                >
                  {stateName}
                  <X className="h-3.5 w-3.5" aria-label={L(lang, "주 필터 해제", "Clear state filter")} />
                </button>
              )}
            </div>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpenId(null);
                }}
                placeholder={L(lang, "대도시권 검색 (예: Austin)", "Search any metro (e.g. Austin)")}
                aria-label={L(lang, "대도시권 검색", "Search metros")}
                className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.05] pl-9 pr-3 text-[16px] text-white outline-none placeholder:text-white/35 focus:border-[#34D399]"
              />
            </div>
            <ul className="mt-2 divide-y divide-white/[0.06]">
              {rows.length === 0 && <li className="py-6 text-center text-[13px] text-white/45">{L(lang, "일치하는 대도시권이 없어요.", "No matching metro.")}</li>}
              {rows.map((s) => {
                const open = openId === s.area.id;
                return (
                  <li key={s.area.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : s.area.id)}
                      className="flex w-full items-center gap-3 py-2.5 text-left"
                    >
                      <span className="w-8 shrink-0 text-right text-[12px] tabular-nums text-white/35">#{rankOf.get(s.area.id)}</span>
                      <span className="min-w-0 flex-1" title={s.area.name}>
                        <span className="line-clamp-2 break-words text-[14px] font-semibold leading-snug text-white/90">{s.area.name}</span>
                        <span className="block text-[12px] text-white/50">
                          {L(lang, `여기선 ${formatUsd(Math.round(s.feelsLike))}처럼 느껴짐`, `Feels like ${formatUsd(Math.round(s.feelsLike))} here`)}
                        </span>
                      </span>
                      <GradeChip grade={s.grade} lang={lang} />
                      <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                    {open && (
                      <div className="mb-3 ml-11 rounded-lg bg-white/[0.03] p-3 text-[12.5px]">
                        <p className="mb-2 text-white/75">{areaSummary(s, lang)}.</p>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          <dt className="text-white/45">{L(lang, `중위 월세 (${bedrooms}침실)`, `Median rent (${bedrooms} bed)`)}</dt>
                          <dd className="text-right tabular-nums text-white">
                            {formatUsd(s.rent)}
                            {s.area.flags.includes(`rent${bedrooms}-topcoded`) ? "+" : ""}
                            {L(lang, "/월", "/mo")}
                          </dd>
                          <dt className="text-white/45">{L(lang, "월세 부담", "Rent burden")}</dt>
                          <dd className="text-right tabular-nums text-white">{Math.round(s.rentBurden * 100)}%</dd>
                          <dt className="text-white/45">{L(lang, "중위 주택 가치", "Median home value")}</dt>
                          <dd className="text-right tabular-nums text-white">
                            {formatUsd(s.area.homeValue!)}
                            {s.area.flags.includes("homeValue-topcoded") ? "+" : ""}
                          </dd>
                          <dt className="text-white/45">{L(lang, "가격/소득 배수", "Price-to-income")}</dt>
                          <dd className="text-right tabular-nums text-white">{s.priceToIncome.toFixed(1)}×</dd>
                          <dt className="text-white/45">{L(lang, "물가 지수 (RPP)", "Price parity (RPP)")}</dt>
                          <dd className="text-right tabular-nums text-white">{s.area.rpp.toFixed(1)}</dd>
                          <dt className="text-white/45">{L(lang, "점수", "LivingScore")}</dt>
                          <dd className="text-right tabular-nums text-white">{Math.round(s.living)}</dd>
                        </dl>
                        {s.area.flags.length > 0 && (
                          <ul className="mt-2 border-t border-white/[0.06] pt-2 text-[11.5px] text-[#FBBF24]/85">
                            {s.area.flags.map((f) => (
                              <li key={f}>{flagText(f, lang)}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-white/40">{DISCLAIMER[lang]}</p>
          </section>

          {/* ── 5. Compare two metros ── */}
          <section aria-label={L(lang, "두 지역 비교", "Compare two metros")} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
            <h2 className="mb-2 px-1 text-[14px] font-bold text-white/90">{L(lang, "두 지역 비교", "Compare two metros")}</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                [cmpA, setCmpA],
                [cmpB, setCmpB],
              ].map(([value, set], i) => (
                <select
                  key={i}
                  value={value as string}
                  onChange={(e) => (set as (v: string) => void)(e.target.value)}
                  aria-label={L(lang, `비교 지역 ${i + 1}`, `Metro ${i + 1}`)}
                  className="h-11 w-full min-w-0 rounded-lg border border-white/10 bg-[#0d0f11] px-2 text-[16px] text-white outline-none focus:border-[#34D399] sm:text-[14px]"
                >
                  {sortedMetros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
            {/* The native select cuts long names on phones; spell them out (2 lines max). */}
            <div className="mt-2 grid grid-cols-2 gap-x-3">
              {cmp.map((s, i) => (
                <p key={i} className="line-clamp-2 break-words text-[12.5px] font-semibold leading-snug text-white/85" title={s?.area.name}>
                  {s?.area.name ?? "n/a"}
                </p>
              ))}
            </div>
            <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 text-[13px]">
              {(
                [
                  [L(lang, "등급", "Grade"), (s: AreaScore) => <GradeChip grade={s.grade} lang={lang} />],
                  [L(lang, "월세 부담", "Rent burden"), (s: AreaScore) => `${Math.round(s.rentBurden * 100)}%`],
                  [L(lang, "중위 월세", "Median rent"), (s: AreaScore) => `${formatUsd(s.rent)}${L(lang, "/월", "/mo")}`],
                  [L(lang, "집값/소득", "Home price ÷ income"), (s: AreaScore) => `${s.priceToIncome.toFixed(1)}×`],
                  [L(lang, "느껴지는 소득", "Feels like"), (s: AreaScore) => formatUsd(Math.round(s.feelsLike))],
                ] as const
              ).map(([label, render]) => (
                <div key={label} className="col-span-2 grid grid-cols-2 gap-x-3 border-b border-white/[0.06] py-2 last:border-0">
                  <dt className="col-span-2 mb-0.5 text-[11px] uppercase tracking-wide text-white/40">{label}</dt>
                  {cmp.map((s, i) => (
                    <dd key={i} className="font-semibold tabular-nums text-white">
                      {s ? render(s) : "n/a"}
                    </dd>
                  ))}
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] text-white/40">{DISCLAIMER[lang]}</p>
          </section>

          {/* ── 6. Share — once, at the end of the results ── */}
          <div className="mx-auto w-full" style={{ maxWidth: 440 }}>
            <ShareButtons
              cardRef={cardRef}
              storyCardRef={storyCardRef}
              width={WIDE_WIDTH}
              height={WIDE_HEIGHT}
              storyWidth={STORY_WIDTH}
              storyHeight={STORY_HEIGHT}
              shareTitle="Where can your income live best?"
              shareText={shareText}
              getShareUrl={() => "/us/where-to-live"}
              downloadName="where-to-live.png"
              storyDownloadName="story-where-to-live.png"
              cardPreview={<LivabilityShareCard variant="wide" cardRef={cardRef} percent={goodPercent} bestName={best?.area.name ?? null} bestGrade={best?.grade ?? null} />}
              storyPreview={<LivabilityShareCard variant="story" cardRef={storyCardRef} percent={goodPercent} bestName={best?.area.name ?? null} bestGrade={best?.grade ?? null} />}
              downloadImageUrl={`/us/where-to-live/og?${ogParams.toString()}`}
              downloadStoryUrl={`/us/where-to-live/og?${ogParams.toString()}&card=story`}
            />
          </div>
        </>
      )}
    </div>
  );
}
