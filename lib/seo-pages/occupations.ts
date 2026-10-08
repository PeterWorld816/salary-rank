// /us/occupations/[slug] and the /us/occupations hub — built from the
// detailed-occupation PUMS curves (scripts/buildDetailedEarnings.ts ->
// public/us-occupation-detail/*.json). Which occupations get a page is
// data/seo/occupationPages.json (the largest samples first); add a row there
// to publish another one.
//
// Paragraph wording is chosen by the page's own numbers (rank among all
// occupations, spread between the top tenth and the median, the shape of the
// age curve, the size/direction of the gender gap, ...), each with at least
// four phrasings, so two pages never share a paragraph.
import fs from "node:fs";
import path from "node:path";
import occupationDetails from "@/data/us/occupationDetails.json";
import occupationCategories from "@/data/us/occupationCategories.json";
import pageConfig from "@/data/seo/occupationPages.json";
import benchmarks from "@/data/us/earningsBenchmarks.json";
import { getValueAtPercentile, type PercentileAnchor } from "@/lib/percentileTable";
import { formatUsd } from "@/lib/usFormat";
import { US_STATES } from "@/data/us/stateMeta";
import { listJoin, ordinal, pct, pick, seedOf, signedPct, type SeoPage } from "@/lib/seo-pages/model";

const ACS = "2020–2024";
const SOURCE = `US Census Bureau, American Community Survey ${ACS} 5-Year Public Use Microdata Sample (PUMS) — personal earnings (PERNP) in 2024 dollars, person-weighted`;

type Entry = { rawCount: number; anchors?: PercentileAnchor[]; fallback?: boolean };
type DetailFile = {
  id: string;
  byAge: Record<string, Entry>;
  byAgeSex: Record<string, Entry>;
  all: Entry;
  bySex: Record<"1" | "2", Entry>;
  byEducation: Record<string, Entry>;
  states: Record<string, { rawCount: number; anchors: PercentileAnchor[] }>;
};

export type OccupationPageEntry = { id: string; slug: string; name: string; plural: string };
export const OCCUPATION_PAGES: OccupationPageEntry[] = pageConfig.pages;
const pageById = new Map(OCCUPATION_PAGES.map((p) => [p.id, p]));
export function occupationPageBySlug(slug: string) {
  return OCCUPATION_PAGES.find((p) => p.slug === slug) ?? null;
}

const AGE_BANDS: [string, string][] = [
  ["25-34", "25–34"],
  ["35-44", "35–44"],
  ["45-54", "45–54"],
  ["55-64", "55–64"],
  ["65-99", "65+"],
];
const EDU: [string, string][] = [
  ["hs_or_less", "High school or less"],
  ["some_college", "Some college / associate"],
  ["bachelors", "Bachelor's"],
  ["masters", "Master's"],
  ["professional", "Professional degree"],
  ["doctorate", "Doctorate"],
];
const EDU_PHRASE: Record<string, string> = {
  hs_or_less: "a high school education or less",
  some_college: "some college or an associate degree",
  bachelors: "a bachelor's degree",
  masters: "a master's degree",
  professional: "a professional degree",
  doctorate: "a doctorate",
};
// Readable name for any detailed occupation: the published page's plural if
// it has one, else the Census title lowercased (and trimmed of "And Other ..." tails).
function plainName(id: string, label: string): string {
  const page = OCCUPATION_PAGES.find((p) => p.id === id);
  if (page) return page.plural;
  return label.replace(/,? and other [^,]+$/i, "").replace(/,\s*$/, "").toLowerCase();
}
const majorLabel = new Map(occupationCategories.categories.map((c) => [c.id, c.label.en]));
const stateByAbbr = new Map(US_STATES.map((s) => [s.abbr, s]));

const cache = new Map<string, DetailFile>();
function load(id: string): DetailFile {
  let f = cache.get(id);
  if (!f) {
    f = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/us-occupation-detail", `${id}.json`), "utf8")) as DetailFile;
    cache.set(id, f);
  }
  return f;
}
const usable = (e: Entry | undefined): e is Entry & { anchors: PercentileAnchor[] } => Boolean(e && !e.fallback && e.anchors && e.anchors.length >= 2);
const p = (e: Entry & { anchors: PercentileAnchor[] }, top: number) => Math.round(getValueAtPercentile(e.anchors, top) ?? NaN);

// Median of every detailed occupation (all 171), for rank + "similar pay".
let allMediansCache: { id: string; label: string; median: number }[] | null = null;
function allMedians() {
  if (!allMediansCache) {
    allMediansCache = occupationDetails.details
      .map((d) => {
        const f = load(d.id);
        return usable(f.all) ? { id: d.id, label: d.label.en, median: p(f.all, 50) } : null;
      })
      .filter((x): x is { id: string; label: string; median: number } => x != null)
      .sort((a, b) => b.median - a.median);
  }
  return allMediansCache;
}

export type OccupationFacts = ReturnType<typeof occupationFacts>;

export function occupationFacts(entry: OccupationPageEntry) {
  const f = load(entry.id);
  const detail = occupationDetails.details.find((d) => d.id === entry.id)!;
  if (!usable(f.all)) throw new Error(`no usable curve for ${entry.id}`);
  const median = p(f.all, 50);
  const top10 = p(f.all, 10);
  const top25 = p(f.all, 25);
  const top75 = p(f.all, 75); // 25th percentile
  const ranked = allMedians();
  const rank = ranked.findIndex((r) => r.id === entry.id) + 1;
  const ages = AGE_BANDS.map(([id, label]) => {
    const e = f.byAge[id];
    return { id, label, median: usable(e) ? p(e, 50) : null, rawCount: e?.rawCount ?? 0 };
  });
  const men = usable(f.bySex["1"]) ? p(f.bySex["1"], 50) : null;
  const women = usable(f.bySex["2"]) ? p(f.bySex["2"], 50) : null;
  const menCount = f.bySex["1"]?.rawCount ?? 0;
  const womenCount = f.bySex["2"]?.rawCount ?? 0;
  const education = EDU.map(([id, label]) => {
    const e = f.byEducation[id];
    return { id, label, median: usable(e) ? p(e, 50) : null, rawCount: e?.rawCount ?? 0 };
  });
  const states = Object.entries(f.states)
    .map(([abbr, s]) => ({ abbr, name: stateByAbbr.get(abbr)?.name ?? abbr.toUpperCase(), rawCount: s.rawCount, median: Math.round(getValueAtPercentile(s.anchors, 50) ?? NaN) }))
    .sort((a, b) => b.rawCount - a.rawCount);
  const similar = ranked
    .filter((r) => r.id !== entry.id && !r.id.startsWith("other_"))
    .map((r) => ({ ...r, name: plainName(r.id, r.label), diff: r.median - median }))
    .sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff))
    .slice(0, 5);
  return {
    entry,
    major: majorLabel.get(detail.majorId) ?? "",
    majorId: detail.majorId,
    rawCount: f.all.rawCount,
    median,
    top10,
    top25,
    top75,
    rank,
    totalRanked: ranked.length,
    allEarners: benchmarks.allEarners25Plus.median,
    ages,
    men,
    women,
    menCount,
    womenCount,
    education,
    states,
    similar,
  };
}

// ── paragraph builders ───────────────────────────────────────────────────

function intro(F: OccupationFacts, seed: number): string {
  const n = F.entry.plural;
  const ratio = F.median / F.allEarners;
  const q = F.rank / F.totalRanked;
  const vs =
    ratio >= 1.05
      ? `${pct((ratio - 1) * 100)} more than the ${formatUsd(F.allEarners)} median for all US earners aged 25 and older`
      : ratio <= 0.95
        ? `${pct((1 - ratio) * 100)} less than the ${formatUsd(F.allEarners)} median for all US earners aged 25 and older`
        : `almost exactly the ${formatUsd(F.allEarners)} median for all US earners aged 25 and older`;
  const where =
    q <= 0.25
      ? [
          `That places the job ${ordinal(F.rank)} of the ${F.totalRanked} occupation groups we track — firmly in the best-paid quarter.`,
          `Among the ${F.totalRanked} occupation groups in our data, only ${F.rank - 1} report a higher median, so this is one of the better-paid lines of work in the country.`,
          `Ranked by median earnings it comes ${ordinal(F.rank)} out of ${F.totalRanked}, inside the top quarter of all the occupations we follow.`,
          `It sits at number ${F.rank} of ${F.totalRanked} occupation groups by median pay, comfortably in the upper quarter.`,
        ]
      : q <= 0.5
        ? [
            `That ranks ${ordinal(F.rank)} of ${F.totalRanked} occupation groups — above the middle of the pack, though short of the top quarter.`,
            `By median pay it lands ${ordinal(F.rank)} among ${F.totalRanked} groups, in the upper half but not the top tier.`,
            `Of the ${F.totalRanked} occupation groups we compare, ${F.rank - 1} have a higher median and ${F.totalRanked - F.rank} have a lower one.`,
            `That is good for ${ordinal(F.rank)} place out of ${F.totalRanked}: better than most, yet well below the highest-paid fields.`,
          ]
        : q <= 0.75
          ? [
              `That ranks ${ordinal(F.rank)} of ${F.totalRanked} occupation groups, just below the middle of the range.`,
              `Measured against ${F.totalRanked} occupation groups it comes ${ordinal(F.rank)}, in the lower-middle part of the pay distribution.`,
              `Only ${F.totalRanked - F.rank} of the ${F.totalRanked} groups we track report a lower median, which puts it in the third quarter.`,
              `It finishes ${ordinal(F.rank)} of ${F.totalRanked} on median pay — below the halfway mark but clear of the lowest-paid groups.`,
            ]
          : [
              `That ranks ${ordinal(F.rank)} of ${F.totalRanked} occupation groups, in the lowest-paid quarter of the list.`,
              `Of the ${F.totalRanked} occupation groups in our data, just ${F.totalRanked - F.rank} have a lower median.`,
              `By median pay it sits ${ordinal(F.rank)} out of ${F.totalRanked}, among the occupations where a typical year of earnings is smallest.`,
              `It places ${ordinal(F.rank)} of ${F.totalRanked} on median earnings — part of the bottom quarter, where part-time schedules are common.`,
            ];
  const open = pick(
    [
      `Half of all ${n} in the United States earned more than ${formatUsd(F.median)} a year, and half earned less — ${vs}.`,
      `The typical (median) annual earnings for ${n} come to ${formatUsd(F.median)}, which is ${vs}.`,
      `Across the country, the midpoint of annual earnings for ${n} is ${formatUsd(F.median)} — ${vs}.`,
      `If you lined up all ${n} by pay, the person in the middle would earn about ${formatUsd(F.median)} a year — ${vs}.`,
    ],
    seed
  );
  const n0 = F.rawCount.toLocaleString("en-US");
  const tail = pick(
    [
      `The figures come from ${n0} survey records of people aged 25 and older with earnings in this occupation.`,
      `That estimate rests on ${n0} individual Census survey responses from workers 25 and up.`,
      `Behind these numbers are ${n0} survey records — a large enough sample to break the results down further below.`,
      `${n0} respondents aged 25+ reported this occupation, which is what the median is calculated from.`,
      `The sample is ${n0} people aged 25 or older who listed this job and had earnings during the year.`,
    ],
    seed,
    20
  );
  return `${open} ${pick(where, seed, 1)} ${tail}`;
}

function spread(F: OccupationFacts, seed: number): string {
  const n = F.entry.plural;
  const r10 = F.top10 / F.median;
  const r75 = F.median / F.top75;
  const lines =
    r10 >= 2.2
      ? [
          `Pay inside this occupation is unusually spread out. Reaching the top 10% takes about ${formatUsd(F.top10)} — ${r10.toFixed(1)} times the median — while the top 25% starts near ${formatUsd(F.top25)}.`,
          `The gap between the middle and the top is wide: the top tenth of ${n} earn at least ${formatUsd(F.top10)}, ${r10.toFixed(1)}× the median, and the top quarter begins around ${formatUsd(F.top25)}.`,
          `Earnings stretch a long way above the middle. The top-quarter line is roughly ${formatUsd(F.top25)}, and it takes ${formatUsd(F.top10)} or more — ${r10.toFixed(1)} times typical pay — to make the top 10%.`,
          `This is a field with a long upper tail: ${formatUsd(F.top25)} gets you into the top quarter, but the top 10% starts near ${formatUsd(F.top10)}, ${r10.toFixed(1)}× what the median worker earns.`,
        ]
      : r10 >= 1.7
        ? [
            `The top 25% of ${n} earn at least ${formatUsd(F.top25)}, and the top 10% start near ${formatUsd(F.top10)} — about ${r10.toFixed(1)} times the median.`,
            `Moving up the ladder, the top-quarter threshold is ${formatUsd(F.top25)} and the top-10% threshold is ${formatUsd(F.top10)}, a ${r10.toFixed(1)}× step up from the middle.`,
            `There is meaningful room above the median: ${formatUsd(F.top25)} marks the top quarter and ${formatUsd(F.top10)} the top tenth (${r10.toFixed(1)}× the median).`,
            `A worker earning ${formatUsd(F.top25)} would already be in the top quarter of ${n}; the top 10% begins around ${formatUsd(F.top10)}, ${r10.toFixed(1)} times the midpoint.`,
          ]
        : [
            `Pay is fairly compressed. The top 10% begins at about ${formatUsd(F.top10)}, only ${r10.toFixed(1)} times the median, and the top quarter starts near ${formatUsd(F.top25)}.`,
            `Compared with many occupations the range is narrow: ${formatUsd(F.top25)} reaches the top quarter and ${formatUsd(F.top10)} the top tenth — just ${r10.toFixed(1)}× the median.`,
            `Earnings cluster around the middle here. The top-10% line, ${formatUsd(F.top10)}, is only ${r10.toFixed(1)} times the median, with the top quarter beginning at ${formatUsd(F.top25)}.`,
            `There isn't a long tail of very high earners: the top tenth of ${n} start near ${formatUsd(F.top10)} (${r10.toFixed(1)}× the median) and the top quarter near ${formatUsd(F.top25)}.`,
          ];
  const low = pick(
    [
      `At the other end, a quarter of ${n} earned ${formatUsd(F.top75)} or less, which partly reflects part-time and part-year work — the survey counts everyone with earnings, not only full-time staff.`,
      `The bottom quarter earned under ${formatUsd(F.top75)}; that group includes people who worked part of the year or reduced hours, since every earner is counted.`,
      `On the lower side, 25% reported ${formatUsd(F.top75)} or less. These are annual totals, so part-time schedules and partial years pull this number down.`,
      `A quarter of workers in the field made ${formatUsd(F.top75)} or less over the year — a figure shaped by part-time and seasonal work as much as by hourly rates.`,
    ],
    seed,
    2
  );
  const ratioLine = pick(
    [
      `The median is ${r75.toFixed(1)} times that lower-quarter line.`,
      `Put differently, the middle earner makes ${r75.toFixed(1)}× what someone at the 25th percentile does.`,
      `So the distance from the bottom quarter to the middle is a factor of ${r75.toFixed(1)}.`,
      `That leaves a ${r75.toFixed(1)}-to-1 ratio between the median and the 25th percentile.`,
    ],
    seed,
    21
  );
  return `${pick(lines, seed, 3)} ${low} ${ratioLine}`;
}

function ageCurve(F: OccupationFacts, seed: number): string {
  const known = F.ages.filter((a) => a.median != null) as { id: string; label: string; median: number; rawCount: number }[];
  if (known.length < 3) return `Age-by-age figures are only published where at least 100 survey records exist; for ${F.entry.plural} that leaves too few age groups to describe a career curve, so the table shows what is available.`;
  const peak = known.reduce((a, b) => (b.median > a.median ? b : a));
  const first = known[0];
  const growth = ((peak.median - first.median) / first.median) * 100;
  const last = known[known.length - 1];
  const drop = ((peak.median - last.median) / peak.median) * 100;
  const shape = peak.id === first.id ? "flat" : growth >= 45 ? "steep" : peak.id === "55-64" ? "late" : "moderate";
  const variants: Record<string, string[]> = {
    steep: [
      `Experience matters a great deal. Median earnings rise from ${formatUsd(first.median)} at ages ${first.label} to ${formatUsd(peak.median)} at ${peak.label}, a ${pct(growth)} climb.`,
      `The career curve is steep: workers aged ${first.label} have a median of ${formatUsd(first.median)}, but by ${peak.label} it reaches ${formatUsd(peak.median)} (${signedPct(growth)}).`,
      `Pay grows sharply with age — from ${formatUsd(first.median)} for the ${first.label} group to a peak of ${formatUsd(peak.median)} at ${peak.label}, ${pct(growth)} higher.`,
      `Few early-career workers earn what mid-career ones do: ${formatUsd(first.median)} at ${first.label} versus ${formatUsd(peak.median)} at ${peak.label}, a gap of ${pct(growth)}.`,
    ],
    moderate: [
      `Earnings build steadily with age, from a median of ${formatUsd(first.median)} at ${first.label} to ${formatUsd(peak.median)} at ${peak.label} (${signedPct(growth)}).`,
      `The age curve is gentle: ${formatUsd(first.median)} for workers aged ${first.label}, peaking at ${formatUsd(peak.median)} for those aged ${peak.label}.`,
      `Mid-career workers out-earn new entrants, but not dramatically — the median goes from ${formatUsd(first.median)} (${first.label}) to ${formatUsd(peak.median)} (${peak.label}).`,
      `Typical pay rises ${pct(growth)} between the ${first.label} and ${peak.label} age groups, topping out at ${formatUsd(peak.median)}.`,
    ],
    late: [
      `Pay keeps climbing late into a career, peaking at ${formatUsd(peak.median)} for workers aged 55–64 — ${pct(growth)} above the ${formatUsd(first.median)} median at ${first.label}.`,
      `Unusually, the highest median belongs to the 55–64 group (${formatUsd(peak.median)}), well above the ${formatUsd(first.median)} seen at ${first.label}.`,
      `Seniority keeps paying off: the median reaches its high point of ${formatUsd(peak.median)} only in the 55–64 band, up ${pct(growth)} from age ${first.label}.`,
      `The curve peaks late — ${formatUsd(peak.median)} at 55–64 against ${formatUsd(first.median)} at ${first.label}.`,
    ],
    flat: [
      `Age makes surprisingly little difference: the youngest group (${first.label}) already has the highest median, ${formatUsd(first.median)}.`,
      `The curve is essentially flat — workers aged ${first.label} earn a median of ${formatUsd(first.median)}, as much as any older group.`,
      `Unlike most fields, earnings don't climb with age here; the ${first.label} group's ${formatUsd(first.median)} median is the highest of all.`,
      `There is no mid-career premium in the medians: ${formatUsd(first.median)} at ${first.label} is the peak.`,
    ],
  };
  const after =
    last.id !== peak.id
      ? pick(
          [
            `After the peak, the 65+ group's median falls to ${formatUsd(last.median)} (${pct(drop)} lower), largely because more older workers cut back their hours.`,
            `Among those 65 and older who still work, the median is ${formatUsd(last.median)}, ${pct(drop)} below the peak — reduced schedules explain much of that.`,
            `Later on, earnings ease to ${formatUsd(last.median)} for workers 65+, a ${pct(drop)} step down that tracks the shift to part-time work.`,
            `By 65+ the median is ${formatUsd(last.median)}, down ${pct(drop)} from the high point, as many people phase into retirement.`,
          ],
          seed,
          4
        )
      : `Even the 65+ group holds at ${formatUsd(last.median)}, the highest point on the curve.`;
  return `${pick(variants[shape], seed, 5)} ${after}`;
}

function gender(F: OccupationFacts, seed: number): string | null {
  if (F.men == null || F.women == null) {
    const thin = F.men == null ? "men" : "women";
    return `A men-versus-women comparison isn't shown: there are fewer than 100 survey records of ${thin} in this occupation, below our publishing threshold (${F.menCount.toLocaleString("en-US")} men and ${F.womenCount.toLocaleString("en-US")} women in the sample).`;
  }
  const gap = ((F.men - F.women) / F.men) * 100;
  const share = Math.round((F.womenCount / (F.menCount + F.womenCount)) * 100);
  const comp = pick(
    [
      `Women make up roughly ${share}% of the survey records here (an unweighted count, so treat it as approximate).`,
      `About ${share}% of the sampled workers are women, going by raw survey counts.`,
      `In the raw sample, roughly ${share} in 100 workers in this job are women.`,
      `Women account for around ${share}% of the records behind these figures.`,
    ],
    seed,
    22
  );
  if (Math.abs(gap) < 5)
    return `${pick(
      [
        `Men and women in this occupation earn almost the same at the median: ${formatUsd(F.men)} and ${formatUsd(F.women)}.`,
        `The gender gap is small — a median of ${formatUsd(F.men)} for men against ${formatUsd(F.women)} for women.`,
        `There's little difference by sex: ${formatUsd(F.women)} for women, ${formatUsd(F.men)} for men.`,
        `Median pay is close to even, ${formatUsd(F.men)} (men) versus ${formatUsd(F.women)} (women).`,
      ],
      seed,
      6
    )} ${comp}`;
  if (gap < 0)
    return `${pick(
      [
        `Women's median earnings (${formatUsd(F.women)}) are actually higher than men's (${formatUsd(F.men)}) in this field.`,
        `Unusually, women out-earn men at the median: ${formatUsd(F.women)} versus ${formatUsd(F.men)}.`,
        `This is one of the occupations where the female median, ${formatUsd(F.women)}, tops the male median of ${formatUsd(F.men)}.`,
        `Men's median here is ${formatUsd(F.men)}, below the ${formatUsd(F.women)} women report.`,
      ],
      seed,
      6
    )} ${comp}`;
  return `${pick(
    [
      `Men's median earnings are ${formatUsd(F.men)} and women's are ${formatUsd(F.women)}, so women's median is ${pct(gap)} lower.`,
      `There is a ${pct(gap)} gap at the median: ${formatUsd(F.men)} for men and ${formatUsd(F.women)} for women.`,
      `Women in this occupation have a median of ${formatUsd(F.women)}, ${pct(gap)} below the ${formatUsd(F.men)} men report.`,
      `By sex, the medians are ${formatUsd(F.men)} (men) and ${formatUsd(F.women)} (women) — a ${pct(gap)} difference.`,
    ],
    seed,
    6
  )} ${comp} ${pick(
    [
      "Differences in hours, specialty and seniority account for part of any gap, which the survey doesn't separate out.",
      "Part of that difference reflects hours worked and job level within the occupation, which these totals don't control for.",
      "Because these are annual totals, more part-time work in one group widens the gap; the survey doesn't adjust for that.",
      "The comparison isn't like-for-like on hours or seniority, so read it as a description rather than a pay-equity measure.",
    ],
    seed,
    23
  )}`;
}

function educationPara(F: OccupationFacts, seed: number): string {
  const known = F.education.filter((e) => e.median != null) as { id: string; label: string; median: number; rawCount: number }[];
  if (known.length < 2) return `An education breakdown needs at least two attainment levels with 100 or more records each; ${F.entry.plural} don't meet that bar, so it isn't shown.`;
  const lo = known.reduce((a, b) => (b.median < a.median ? b : a));
  const hi = known.reduce((a, b) => (b.median > a.median ? b : a));
  const common = F.education.reduce((a, b) => (b.rawCount > a.rawCount ? b : a));
  const prem = ((hi.median - lo.median) / lo.median) * 100;
  const body =
    prem >= 60
      ? [
          `Credentials make a large difference. Workers with ${EDU_PHRASE[hi.id]} have a median of ${formatUsd(hi.median)}, ${pct(prem)} more than those with ${EDU_PHRASE[lo.id]} (${formatUsd(lo.median)}).`,
          `The education premium is steep: ${formatUsd(hi.median)} at the median for workers with ${EDU_PHRASE[hi.id]} against ${formatUsd(lo.median)} for those with ${EDU_PHRASE[lo.id]}.`,
          `Workers with ${EDU_PHRASE[hi.id]} (${formatUsd(hi.median)}) earn ${pct(prem)} more than those with ${EDU_PHRASE[lo.id]} (${formatUsd(lo.median)}).`,
          `Within the same job title, ${EDU_PHRASE[hi.id]} goes with a ${formatUsd(hi.median)} median, versus ${formatUsd(lo.median)} for ${EDU_PHRASE[lo.id]} — a ${pct(prem)} difference.`,
        ]
      : [
          `Education shifts pay modestly here: medians range from ${formatUsd(lo.median)} (${EDU_PHRASE[lo.id]}) to ${formatUsd(hi.median)} (${EDU_PHRASE[hi.id]}).`,
          `The spread by education is moderate — ${pct(prem)} between workers with ${EDU_PHRASE[lo.id]} (${formatUsd(lo.median)}) and those with ${EDU_PHRASE[hi.id]} (${formatUsd(hi.median)}).`,
          `Degrees matter less than in many fields: ${formatUsd(hi.median)} with ${EDU_PHRASE[hi.id]} versus ${formatUsd(lo.median)} with ${EDU_PHRASE[lo.id]}.`,
          `From ${EDU_PHRASE[lo.id]} to ${EDU_PHRASE[hi.id]}, the median rises from ${formatUsd(lo.median)} to ${formatUsd(hi.median)}, a ${pct(prem)} gap.`,
        ];
  const cn = common.rawCount.toLocaleString("en-US");
  return `${pick(body, seed, 7)} ${pick(
    [
      `The largest group in the sample has ${EDU_PHRASE[common.id]} (${cn} records). Levels with fewer than 100 records are left out rather than estimated.`,
      `Most workers surveyed in this job have ${EDU_PHRASE[common.id]} (${cn} records); any level under 100 records is blank in the table.`,
      `The most common credential in the sample is ${EDU_PHRASE[common.id]}, with ${cn} records. Thin cells (under 100 records) aren't shown.`,
      `${cn} of the records belong to people with ${EDU_PHRASE[common.id]}, the biggest single group; we suppress levels with fewer than 100.`,
    ],
    seed,
    24
  )}`;
}

function statesPara(F: OccupationFacts, seed: number): string | null {
  const top5 = F.states.slice(0, 5);
  if (top5.length < 3) return null;
  const best = top5.reduce((a, b) => (b.median > a.median ? b : a));
  const worst = top5.reduce((a, b) => (b.median < a.median ? b : a));
  const spreadPct = ((best.median - worst.median) / worst.median) * 100;
  const names = listJoin(top5.map((s) => s.name));
  return `${pick(
    [
      `The five states with the most ${F.entry.plural} in the survey are ${names}.`,
      `Most of the sample comes from ${names}, the five states where this occupation is most common in the data.`,
      `${names} contribute the largest numbers of survey records for this job.`,
      `In terms of headcount in the survey, ${names} lead the country.`,
    ],
    seed,
    8
  )} ${pick(
    [
      `Among them, ${best.name} has the highest median at ${formatUsd(best.median)} and ${worst.name} the lowest at ${formatUsd(worst.median)}, a ${pct(spreadPct)} spread.`,
      `Pay differs noticeably even across these five: ${formatUsd(best.median)} in ${best.name} versus ${formatUsd(worst.median)} in ${worst.name}.`,
      `${best.name} pays best of the five (${formatUsd(best.median)} median); ${worst.name} pays least (${formatUsd(worst.median)}).`,
      `The state medians range from ${formatUsd(worst.median)} in ${worst.name} up to ${formatUsd(best.median)} in ${best.name}.`,
    ],
    seed,
    9
  )} ${pick(
    [
      `These are nominal dollars — living costs differ just as much between states and aren't adjusted for. ${F.states.length} states have enough records (100+) for their own figure.`,
      `No cost-of-living adjustment is applied. In all, ${F.states.length} states clear the 100-record bar for a state-level median.`,
      `State figures aren't price-adjusted; ${F.states.length} states have a large enough sample to report.`,
      `${F.states.length} states have 100+ records for this job; elsewhere the sample is too small to publish, and none of the figures adjust for local prices.`,
    ],
    seed,
    25
  )}`;
}

function similarPara(F: OccupationFacts, seed: number): string {
  const items = F.similar.slice(0, 4).map((s) => `${s.name} (${formatUsd(s.median)})`);
  return `${pick(
    [
      `Occupations with a median close to ${formatUsd(F.median)} include ${listJoin(items)}.`,
      `For comparison, these jobs have medians within a few thousand dollars: ${listJoin(items)}.`,
      `Nearby on the pay scale are ${listJoin(items)}.`,
      `Similar typical earnings show up for ${listJoin(items)}.`,
    ],
    seed,
    10
  )} ${pick(
    [
      "Similar pay doesn't mean similar work — training, hours and risk differ — but it's a useful reference when weighing a move.",
      "The jobs differ in training and working conditions; matching medians just means the typical paycheck is comparable.",
      "Each of these takes a different path in, but a typical year's earnings lands in the same range.",
      "They aren't interchangeable careers, though the middle of the pay distribution is close.",
    ],
    seed,
    26
  )}`;
}

function method(F: OccupationFacts, seed: number): string {
  return pick(
    [
      `How to read these numbers: they are annual personal earnings (wages plus self-employment income) for people aged 25+ who reported working as ${F.entry.plural}, pooled over ${ACS} and adjusted to 2024 dollars. Part-time and part-year workers are included. Every group shown has at least 100 survey records; ${F.rawCount.toLocaleString("en-US")} records sit behind the headline median.`,
      `About the data: the American Community Survey asks people their occupation and earnings; we pool the ${ACS} responses, convert them to 2024 dollars, and weight each person to represent the population. The ${F.rawCount.toLocaleString("en-US")} records for ${F.entry.plural} include part-time workers, so these are annual totals rather than full-time salaries.`,
      `Method note: earnings here are PERNP — wages, salary and self-employment income — for workers 25 and older, from the ${ACS} ACS microdata in 2024 dollars. Any group with fewer than 100 records is suppressed instead of estimated. This page draws on ${F.rawCount.toLocaleString("en-US")} records.`,
      `A note on definitions: figures cover everyone 25+ with earnings in this occupation over ${ACS}, inflation-adjusted to 2024, full-time or not. Medians are weighted to the US population; suppressed cells are those under 100 records. The occupation total is ${F.rawCount.toLocaleString("en-US")} records.`,
    ],
    seed,
    11
  );
}

// ── page ─────────────────────────────────────────────────────────────────

export function buildOccupationPage(entry: OccupationPageEntry): SeoPage {
  const F = occupationFacts(entry);
  const seed = seedOf(entry.slug);
  const pagePath = `/us/occupations/${entry.slug}`;
  const sections: SeoPage["sections"] = [];

  sections.push({
    heading: `How much do ${entry.plural} earn?`,
    paragraphs: [intro(F, seed)],
    table: {
      caption: `${entry.name}: annual earnings thresholds (nationwide)`,
      head: ["Position", "Annual earnings"],
      rows: [
        ["Top 10% start at", formatUsd(F.top10)],
        ["Top 25% start at", formatUsd(F.top25)],
        ["Median (top 50%)", formatUsd(F.median)],
        ["Bottom 25% earn below", formatUsd(F.top75)],
      ],
    },
  });
  sections.push({ heading: "How wide is the pay range?", paragraphs: [spread(F, seed)] });
  sections.push({
    heading: "Earnings by age",
    paragraphs: [ageCurve(F, seed)],
    bars: F.ages
      .filter((a) => a.median != null)
      .map((a) => ({ label: a.label, value: a.median as number, display: formatUsd(a.median as number) })),
  });
  const g = gender(F, seed);
  if (g)
    sections.push({
      heading: "Men and women",
      paragraphs: [g],
      table:
        F.men != null && F.women != null
          ? { head: ["Group", "Median earnings", "Survey records"], rows: [["Men", formatUsd(F.men), F.menCount.toLocaleString("en-US")], ["Women", formatUsd(F.women), F.womenCount.toLocaleString("en-US")]] }
          : undefined,
    });
  sections.push({
    heading: "Does education change the pay?",
    paragraphs: [educationPara(F, seed)],
    table: {
      head: ["Education", "Median earnings", "Survey records"],
      rows: F.education.map((e) => [e.label, e.median != null ? formatUsd(e.median) : "Not shown (<100 records)", e.rawCount.toLocaleString("en-US")]),
    },
  });
  const st = statesPara(F, seed);
  if (st)
    sections.push({
      heading: "Where the most work, and what they earn there",
      paragraphs: [st],
      table: { head: ["State", "Median earnings", "Survey records"], rows: F.states.slice(0, 5).map((s) => [s.name, formatUsd(s.median), s.rawCount.toLocaleString("en-US")]) },
    });
  sections.push({
    heading: "Occupations with similar pay",
    paragraphs: [similarPara(F, seed)],
    table: { head: ["Occupation", "Median earnings", "vs. this job"], rows: F.similar.map((s) => [OCCUPATION_PAGES.find((o) => o.id === s.id)?.name ?? s.label.replace(/,? And Other [^,]+$/, ""), formatUsd(s.median), signedPct((s.diff / F.median) * 100)]) },
  });
  sections.push({ heading: "About these figures", paragraphs: [method(F, seed)] });

  const related = [
    ...F.similar
      .map((s) => pageById.get(s.id))
      .filter((x): x is OccupationPageEntry => Boolean(x))
      .map((x) => ({ href: `/us/occupations/${x.slug}`, label: `${x.name} salary` })),
    // Same major group, other published pages.
    ...OCCUPATION_PAGES.filter((o) => o.id !== entry.id && occupationDetails.details.find((d) => d.id === o.id)?.majorId === F.majorId)
      .slice(0, 3)
      .map((o) => ({ href: `/us/occupations/${o.slug}`, label: `${o.name} salary` })),
    { href: "/us/occupations", label: "All occupations by median pay" },
    { href: "/us/net-worth", label: "Net worth by age" },
    ...F.states.slice(0, 2).map((s) => ({ href: `/us/${s.abbr}`, label: `Household income in ${s.name}` })),
    { href: "/us/insights/understanding-income-percentiles", label: "How income percentiles work" },
  ];
  const dedup = [...new Map(related.map((l) => [l.href, l])).values()].slice(0, 9);

  return {
    path: pagePath,
    kind: "occupation",
    title: `${entry.name} Salary: Median ${formatUsd(F.median)}, Top 10% ${formatUsd(F.top10)} (${ACS} data)`,
    description: `${entry.name} earn a median of ${formatUsd(F.median)} a year in the US; the top 25% make ${formatUsd(F.top25)}+ and the top 10% ${formatUsd(F.top10)}+. See pay by age, sex, education and state.`,
    h1: `${entry.name} salary in the US`,
    lede: pick(
      [
        `What do ${entry.plural} actually earn, and how does that change with age, education and location? These figures come straight from Census survey microdata.`,
        `A data-first look at ${entry.plural}' pay: the median, the thresholds for the top 25% and top 10%, and how earnings vary across the country.`,
        `Here is where pay for ${entry.plural} stands nationally, built from Census microdata rather than job-board postings.`,
        `From the median paycheck to the top 10%, this page breaks down earnings for ${entry.plural} using American Community Survey records.`,
      ],
      seed,
      12
    ),
    sections,
    midAdAfter: 3,
    related: dedup,
    cta: {
      href: `/us/occupations/${entry.slug}/calculate`,
      label: `See where your pay ranks among ${entry.plural}`,
      body: `Opens the calculator with this occupation already selected. Your income stays in your browser — it's never put in the link.`,
    },
    breadcrumbs: [
      { name: "Home", path: "/us" },
      { name: "Occupations", path: "/us/occupations" },
      { name: entry.name, path: pagePath },
    ],
    sources: [SOURCE],
    dataFields: { median: F.median, top10: F.top10, top25: F.top25, top75: F.top75, rank: F.rank, ageCount: F.ages.filter((a) => a.median != null).length || null, allEarners: F.allEarners },
  };
}

export function buildOccupationHub(): SeoPage {
  const rows = OCCUPATION_PAGES.map((e) => ({ e, F: occupationFacts(e) })).sort((a, b) => b.F.median - a.F.median);
  const hi = rows[0];
  const lo = rows[rows.length - 1];
  const mid = rows[Math.floor(rows.length / 2)];
  const all = allMedians();
  const above = rows.filter((r) => r.F.median > benchmarks.allEarners25Plus.median).length;
  const byMajor = new Map<string, typeof rows>();
  for (const r of rows) byMajor.set(r.F.major, [...(byMajor.get(r.F.major) ?? []), r]);
  return {
    path: "/us/occupations",
    kind: "occupationHub",
    title: `Salary by Occupation: Median Pay for ${rows.length} US Jobs (${ACS} Census data)`,
    description: `Median annual earnings and top-10% thresholds for ${rows.length} of the most common US occupations, from ${formatUsd(lo.F.median)} to ${formatUsd(hi.F.median)}, built from Census microdata.`,
    h1: "Salary by occupation",
    lede: `How much do people in the most common US jobs earn? Each page below is built from American Community Survey microdata for ${ACS} — the median, the top 25% and top 10% lines, and how pay changes with age, sex, education and state.`,
    sections: [
      {
        heading: "What's covered",
        paragraphs: [
          `We break the Census occupation codes into ${all.length} groups that each have at least 10,000 survey records of workers aged 25 to 64, then publish a full page for the ${rows.length} largest. Large samples matter: they let us show pay by age band, by sex and by education level without guessing, and every cell with fewer than 100 records is left blank instead of estimated.`,
          `Across these ${rows.length} occupations the median runs from ${formatUsd(lo.F.median)} for ${lo.e.plural} to ${formatUsd(hi.F.median)} for ${hi.e.plural}. The middle of the list is ${mid.e.plural} at ${formatUsd(mid.F.median)}. ${above} of the ${rows.length} pay more than the ${formatUsd(benchmarks.allEarners25Plus.median)} median for all US earners aged 25 and older.`,
          `All figures are personal earnings — wages, salary and self-employment income — in 2024 dollars, and they include part-time and part-year workers. That makes them lower than the full-time salary figures you'll see in job postings, but it means they describe what people in each occupation actually took home over a year. If you want to see where your own pay falls inside an occupation, each page links straight to the calculator with that job pre-selected.`,
        ],
        table: {
          caption: "Published occupations, highest median first",
          head: ["Occupation", "Median", "Top 10% from"],
          rows: rows.map((r) => [r.e.name, formatUsd(r.F.median), formatUsd(r.F.top10)]),
        },
      },
      {
        heading: "Browse by field",
        paragraphs: [
          `The ${byMajor.size} fields below follow the Census's major occupation groups. Within a field, pay can differ more than it does between fields — compare, say, ${listJoin(rows.filter((r) => r.F.majorId === hi.F.majorId).slice(0, 2).map((r) => r.e.plural))} — so the detailed page is usually the better reference.`,
        ],
      },
    ],
    midAdAfter: 1,
    related: [],
    breadcrumbs: [
      { name: "Home", path: "/us" },
      { name: "Occupations", path: "/us/occupations" },
    ],
    sources: [SOURCE],
    dataFields: { count: rows.length, hi: hi.F.median, lo: lo.F.median, mid: mid.F.median },
  };
}

export function occupationHubGroups() {
  const rows = OCCUPATION_PAGES.map((e) => ({ e, F: occupationFacts(e) }));
  const groups = new Map<string, { href: string; label: string; note: string }[]>();
  for (const r of rows.sort((a, b) => b.F.median - a.F.median))
    groups.set(r.F.major, [...(groups.get(r.F.major) ?? []), { href: `/us/occupations/${r.e.slug}`, label: r.e.name, note: `${formatUsd(r.F.median)} median` }]);
  return [...groups.entries()].map(([major, links]) => ({ major, links }));
}

// Client-safe map id -> slug lives in data/seo/occupationPages.json too, so
// the result screen can link "see this occupation's page".
export function occupationSlugForId(id: string) {
  return pageById.get(id)?.slug ?? null;
}
