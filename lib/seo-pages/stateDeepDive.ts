// The "deep dive" block added to each existing /us/[state] page — threshold
// table, earnings by age, gap with the nation, household types, highest and
// lowest-income counties, and a state-specific write-up whose wording follows
// the state's own numbers. Server/build-time only; the county list is passed
// in (the page gets it from lib/usCountyPlaceData.ts, the quality gate reads
// the JSON directly) so this file never imports the server-only module.
import stateEarningsByAge from "@/data/us/stateEarningsByAge.json";
import nationalIncome from "@/data/us/nationalIncome.json";
import type { PercentileAnchor } from "@/lib/percentileTable";
import {
  getStateIncome,
  getStateIncomePercentile,
  getStateIncomeRank,
  nationalMedianHouseholdIncome,
  acs5YearRange,
  type UsCountyIncome,
} from "@/lib/usIncomeCalc";
import { getValueAtPercentile } from "@/lib/percentileTable";
import { formatUsd, stripStateSuffix } from "@/lib/usFormat";
import type { StateMeta } from "@/data/us/stateMeta";
import { listJoin, ordinal, pct, pick, seedOf, signedPct, type SeoPage } from "@/lib/seo-pages/model";

const AGE: [string, string][] = [
  ["25-34", "25–34"],
  ["35-44", "35–44"],
  ["45-54", "45–54"],
  ["55-64", "55–64"],
  ["65-99", "65+"],
];
type Med = { median: number | null; rawCount: number };
const national = stateEarningsByAge.national as Record<string, Med>;

export function stateDeepDiveFacts(state: StateMeta, counties: Pick<UsCountyIncome, "fips" | "name" | "medianHouseholdIncome">[]) {
  const s = getStateIncome(state.fips);
  if (!s || s.medianHouseholdIncome == null || s.percentileAnchors.length < 2) return null;
  const nat = nationalMedianHouseholdIncome ?? NaN;
  const topBracketShare = s.percentileAnchors[0].topPercent; // share of households at $200K+
  const thresholds = [50, 25, 10, 5, 1].map((t) => ({
    t,
    value: t >= topBracketShare ? Math.round(getValueAtPercentile(s.percentileAnchors, t) ?? NaN) : null,
  }));
  const ages = AGE.map(([id, label]) => {
    const st = (stateEarningsByAge.states as Record<string, Record<string, Med>>)[state.abbr]?.[id];
    return { id, label, state: st?.median ?? null, nation: national[id]?.median ?? null, rawCount: st?.rawCount ?? 0 };
  });
  const ranked = counties
    .filter((c) => c.medianHouseholdIncome != null)
    .map((c) => ({ fips: c.fips, name: stripStateSuffix(c.name, state.name), median: c.medianHouseholdIncome as number }))
    .sort((a, b) => b.median - a.median);
  return {
    state,
    median: s.medianHouseholdIncome,
    nat,
    gapPct: ((s.medianHouseholdIncome - nat) / nat) * 100,
    rank: getStateIncomeRank(state.fips),
    topBracketShare,
    thresholds,
    married: s.byMaritalStatus.married,
    single: s.byMaritalStatus.single,
    oneYear: s.latest1Year,
    ages,
    counties: ranked,
  };
}
export type StateDeepDiveFacts = NonNullable<ReturnType<typeof stateDeepDiveFacts>>;

function overview(F: StateDeepDiveFacts, seed: number): string {
  const n = F.state.name;
  const rank = F.rank?.rank ?? 0;
  const total = F.rank?.total ?? 51;
  const gap = Math.abs(F.gapPct);
  const dir = F.gapPct >= 0 ? "above" : "below";
  const q = rank / total;
  const v =
    q <= 0.2
      ? [
          `${n} is one of the country's higher-income states. Its median household income of ${formatUsd(F.median)} ranks ${ordinal(rank)} of ${total} (the 50 states plus DC) and runs ${pct(gap)} ${dir} the national median of ${formatUsd(F.nat)}.`,
          `With a median household income of ${formatUsd(F.median)}, ${n} sits ${ordinal(rank)} among ${total} states and DC — ${pct(gap)} ${dir} the US figure of ${formatUsd(F.nat)}.`,
          `Households in ${n} have a median income of ${formatUsd(F.median)}, ${pct(gap)} ${dir} the national ${formatUsd(F.nat)}, good for ${ordinal(rank)} place out of ${total}.`,
          `Ranked ${ordinal(rank)} of ${total}, ${n} is near the top of the list: its ${formatUsd(F.median)} median household income is ${pct(gap)} ${dir} the US median.`,
        ]
      : q <= 0.6
        ? [
            `${n}'s median household income is ${formatUsd(F.median)}, ${ordinal(rank)} of ${total} states and DC and ${pct(gap)} ${dir} the national median of ${formatUsd(F.nat)}.`,
            `At ${formatUsd(F.median)}, the typical household income in ${n} lands ${ordinal(rank)} out of ${total}, ${pct(gap)} ${dir} the US median (${formatUsd(F.nat)}).`,
            `${n} sits in the middle of the national pack: ${formatUsd(F.median)} at the median, ranking ${ordinal(rank)} of ${total} and ${pct(gap)} ${dir} the ${formatUsd(F.nat)} US figure.`,
            `The median ${n} household earns ${formatUsd(F.median)} a year — ${ordinal(rank)} among ${total} states and DC, and ${pct(gap)} ${dir} the national median.`,
          ]
        : [
            `${n} is among the lower-income states: its median household income, ${formatUsd(F.median)}, ranks ${ordinal(rank)} of ${total} and is ${pct(gap)} ${dir} the national ${formatUsd(F.nat)}.`,
            `The median household in ${n} brings in ${formatUsd(F.median)}, ${pct(gap)} ${dir} the US median of ${formatUsd(F.nat)} — ${ordinal(rank)} of ${total}.`,
            `At ${formatUsd(F.median)}, ${n}'s median household income is ${pct(gap)} ${dir} the nation's, placing it ${ordinal(rank)} out of ${total}.`,
            `${n} ranks ${ordinal(rank)} of ${total} on median household income (${formatUsd(F.median)}), ${pct(gap)} ${dir} the ${formatUsd(F.nat)} national figure.`,
          ];
  const prices = pick(
    [
      "These are nominal dollars; living costs differ between states and aren't adjusted for here.",
      "Prices for housing and everyday costs also differ by state, and these figures don't adjust for them.",
      "Keep in mind the numbers aren't price-adjusted, so they compare incomes, not purchasing power.",
      "No cost-of-living adjustment is applied, so this compares dollars earned rather than what they buy.",
    ],
    seed,
    9
  );
  return `${pick(v, seed)} ${prices}`;
}

function thresholdPara(F: StateDeepDiveFacts, seed: number): string {
  const t25 = F.thresholds.find((x) => x.t === 25)!.value;
  const t10 = F.thresholds.find((x) => x.t === 10)!.value;
  const share = F.topBracketShare;
  const lines = [
    `About ${pct(share)} of ${F.state.name} households report income of $200,000 or more, the Census's top published bracket.`,
    `Roughly ${pct(share)} of households in ${F.state.name} sit in the $200,000-and-up bracket.`,
    `In ${F.state.name}, ${pct(share)} of households have incomes of at least $200,000.`,
    `The share of ${F.state.name} households at $200,000 or more is about ${pct(share)}.`,
  ];
  const t = [
    t25 != null ? `the top 25% start at about ${formatUsd(t25)}` : `the top 25% are already inside that $200,000+ bracket`,
    t10 != null ? `the top 10% at about ${formatUsd(t10)}` : `the top 10% sit above $200,000`,
  ];
  return `${pick(lines, seed, 1)} By household income, ${t[0]}, and ${t[1]}. The table marks lines that fall above $200,000 rather than guessing their value: the Census groups everyone above that amount together, so the exact top-5% and top-1% cutoffs can't be read from this data.`;
}

function agePara(F: StateDeepDiveFacts, seed: number): string {
  const known = F.ages.filter((a) => a.state != null && a.nation != null) as { id: string; label: string; state: number; nation: number; rawCount: number }[];
  if (known.length < 3) return `Personal earnings by age aren't shown for ${F.state.name}: fewer than three age groups have the 100+ survey records we require.`;
  const peak = known.reduce((a, b) => (b.state > a.state ? b : a));
  const first = known[0];
  const diffs = known.map((a) => ((a.state - a.nation) / a.nation) * 100);
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const widest = known[diffs.map(Math.abs).indexOf(Math.max(...diffs.map(Math.abs)))];
  const climb = ((peak.state - first.state) / first.state) * 100;
  return `${pick(
    [
      `For individual workers, median earnings in ${F.state.name} rise from ${formatUsd(first.state)} at ages ${first.label} to a peak of ${formatUsd(peak.state)} at ${peak.label} (${signedPct(climb)}).`,
      `Personal earnings follow the usual career arc: ${formatUsd(first.state)} for ${F.state.name} workers aged ${first.label}, topping out at ${formatUsd(peak.state)} for those aged ${peak.label}.`,
      `Looking at individual earners rather than households, the ${F.state.name} median climbs ${pct(climb)} from the ${first.label} group (${formatUsd(first.state)}) to the ${peak.label} group (${formatUsd(peak.state)}).`,
      `Earnings per worker in ${F.state.name} peak at ${peak.label}, with a median of ${formatUsd(peak.state)}, compared with ${formatUsd(first.state)} for workers aged ${first.label}.`,
    ],
    seed,
    2
  )} ${pick(
    [
      `Across age groups, ${F.state.name} averages ${signedPct(avgDiff)} against the national medians; the widest gap is at ${widest.label} (${formatUsd(widest.state)} versus ${formatUsd(widest.nation)} nationally).`,
      `On average the state runs ${signedPct(avgDiff)} relative to the US at each age, with the largest difference among workers aged ${widest.label}.`,
      `Compared age-for-age with the nation, the gap averages ${signedPct(avgDiff)} and is largest at ${widest.label}: ${formatUsd(widest.state)} here, ${formatUsd(widest.nation)} nationwide.`,
      `Age group by age group, ${F.state.name} sits ${signedPct(avgDiff)} from the national medians on average — most noticeably at ${widest.label}.`,
    ],
    seed,
    3
  )} These figures are personal earnings (wages plus self-employment) from Census microdata, so they're lower than household income, which can combine several earners.`;
}

function householdPara(F: StateDeepDiveFacts, seed: number): string | null {
  if (F.married == null || F.single == null) return null;
  const r = F.married / F.single;
  return pick(
    [
      `Household type matters as much as location. Married-couple households in ${F.state.name} have a median income of ${formatUsd(F.married)}, ${r.toFixed(1)} times the ${formatUsd(F.single)} for single-person and other non-family households — often two incomes against one.`,
      `Married couples' median household income in ${F.state.name} is ${formatUsd(F.married)}; for single and non-family households it's ${formatUsd(F.single)}. That ${r.toFixed(1)}× gap is mostly the second earner.`,
      `If you live alone, the more relevant benchmark is the ${formatUsd(F.single)} median for single and non-family households, not the ${formatUsd(F.married)} figure for married couples (${r.toFixed(1)}× higher).`,
      `Splitting ${F.state.name} households by type: ${formatUsd(F.married)} for married couples versus ${formatUsd(F.single)} for single and non-family households, a ratio of ${r.toFixed(1)} to 1.`,
    ],
    seed,
    4
  );
}

function countyPara(F: StateDeepDiveFacts, seed: number): string {
  const c = F.counties;
  if (c.length === 0) return `County-level income figures aren't available for ${F.state.name}.`;
  if (c.length === 1) return `${F.state.name} is reported as a single county-equivalent, so there's no county-by-county spread to compare; its median is ${formatUsd(c[0].median)}.`;
  const top = c[0];
  const bottom = c[c.length - 1];
  const ratio = top.median / bottom.median;
  return `${pick(
    ratio >= 2
      ? [
          `Incomes vary widely within the state. ${top.name} has the highest county median at ${formatUsd(top.median)}, ${ratio.toFixed(1)} times that of ${bottom.name} (${formatUsd(bottom.median)}).`,
          `The gap between ${F.state.name}'s richest and poorest counties is large: ${formatUsd(top.median)} in ${top.name} against ${formatUsd(bottom.median)} in ${bottom.name}.`,
          `County medians stretch from ${formatUsd(bottom.median)} in ${bottom.name} up to ${formatUsd(top.median)} in ${top.name} — a ${ratio.toFixed(1)}-fold range.`,
          `${top.name} (${formatUsd(top.median)}) and ${bottom.name} (${formatUsd(bottom.median)}) mark the two ends of a wide county range, ${ratio.toFixed(1)} to 1.`,
        ]
      : [
          `County incomes are relatively even here: the highest median, ${formatUsd(top.median)} in ${top.name}, is ${ratio.toFixed(1)} times the lowest, ${formatUsd(bottom.median)} in ${bottom.name}.`,
          `${F.state.name}'s counties sit fairly close together, from ${formatUsd(bottom.median)} (${bottom.name}) to ${formatUsd(top.median)} (${top.name}).`,
          `The county range is narrow by national standards — ${ratio.toFixed(1)}× between ${top.name} at the top and ${bottom.name} at the bottom.`,
          `Between ${top.name} (${formatUsd(top.median)}) and ${bottom.name} (${formatUsd(bottom.median)}), county medians differ by ${ratio.toFixed(1)} times.`,
        ],
    seed,
    5
  )} ${c.length >= 10 ? `The five highest-income counties are ${listJoin(c.slice(0, 5).map((x) => x.name))}; the five lowest are ${listJoin(c.slice(-5).reverse().map((x) => x.name))}.` : `All ${c.length} counties are listed in the table.`}`;
}

const natAnchors = nationalIncome.percentileAnchors as PercentileAnchor[];
const natTop25 = Math.round(getValueAtPercentile(natAnchors, 25) ?? NaN);
const natTopShare = natAnchors[0].topPercent;

// The state's own lines against the same lines nationwide.
function versusNation(F: StateDeepDiveFacts, seed: number): string {
  const t25 = F.thresholds.find((x) => x.t === 25)!.value;
  const shareDiff = F.topBracketShare - natTopShare;
  const first =
    t25 != null
      ? pick(
          [
            `Reaching the top quarter of households takes about ${formatUsd(t25)} in ${F.state.name}, compared with ${formatUsd(natTop25)} nationally.`,
            `The top-25% line is roughly ${formatUsd(t25)} here and ${formatUsd(natTop25)} for the US as a whole.`,
            `A household needs around ${formatUsd(t25)} to be in ${F.state.name}'s top quarter; nationwide the bar is ${formatUsd(natTop25)}.`,
            `${F.state.name}'s top-quarter threshold of about ${formatUsd(t25)} compares with ${formatUsd(natTop25)} across the country.`,
          ],
          seed,
          10
        )
      : `In ${F.state.name} even the top-quarter line sits above $200,000, against ${formatUsd(natTop25)} nationally.`;
  const second = pick(
    [
      `The share of households at $200,000 or more is ${pct(F.topBracketShare)} versus ${pct(natTopShare)} nationwide, ${Math.abs(shareDiff) < 1 ? "about the same" : `${Math.abs(Math.round(shareDiff))} points ${shareDiff > 0 ? "higher" : "lower"}`}.`,
      `${pct(F.topBracketShare)} of households here earn $200,000+, against ${pct(natTopShare)} in the US overall.`,
      `Nationally ${pct(natTopShare)} of households are in the $200,000+ bracket; in ${F.state.name} it's ${pct(F.topBracketShare)}.`,
      `Households earning over $200,000 make up ${pct(F.topBracketShare)} of the state, compared with a ${pct(natTopShare)} national share.`,
    ],
    seed,
    11
  );
  return `${first} ${second}`;
}

// How many of the state's counties beat the national median.
function countyCount(F: StateDeepDiveFacts, seed: number): string | null {
  const c = F.counties;
  if (c.length < 2) return null;
  const above = c.filter((x) => x.median > F.nat).length;
  const share = (above / c.length) * 100;
  const median = c[Math.floor(c.length / 2)];
  return pick(
    [
      `Of ${F.state.name}'s ${c.length} counties, ${above} have a median household income above the national ${formatUsd(F.nat)} — ${pct(share)} of them. The middle county on the list, ${median.name}, sits at ${formatUsd(median.median)}.`,
      `${above} of the ${c.length} counties (${pct(share)}) clear the US median of ${formatUsd(F.nat)}; the typical county, ${median.name}, comes in at ${formatUsd(median.median)}.`,
      `${above > c.length / 2 ? "" : "Only "}${above} out of ${c.length} counties top the national median, or ${pct(share)}. ${median.name} is the median county at ${formatUsd(median.median)}.`,
      `Counting counties: ${above} of ${c.length} (${pct(share)}) are above the ${formatUsd(F.nat)} national median, and the county in the middle of the ranking, ${median.name}, reports ${formatUsd(median.median)}.`,
    ],
    seed,
    12
  );
}

// Spread: how far the top-quarter line sits above the median, vs. the US.
function spreadPara(F: StateDeepDiveFacts, seed: number): string | null {
  const t25 = F.thresholds.find((x) => x.t === 25)!.value;
  const t50 = F.thresholds.find((x) => x.t === 50)!.value;
  if (t25 == null || t50 == null) return null;
  const natMid = getValueAtPercentile(natAnchors, 50) ?? NaN;
  const r = t25 / t50;
  const rn = natTop25 / natMid;
  const wider = r > rn + 0.02 ? "wider than" : r < rn - 0.02 ? "narrower than" : "about the same as";
  return pick(
    [
      `The top-quarter line is ${r.toFixed(2)} times the state's midpoint income, ${wider} the national ratio of ${rn.toFixed(2)} — a rough gauge of how stretched the upper half of the income distribution is.`,
      `Between the median and the top-25% line, incomes rise by a factor of ${r.toFixed(2)} in ${F.state.name}; nationally the step is ${rn.toFixed(2)}, so the upper half here is ${wider} the US.`,
      `A simple spread measure — top-25% line divided by the median — comes to ${r.toFixed(2)} for ${F.state.name} against ${rn.toFixed(2)} for the country, ${wider} the national pattern.`,
      `Comparing the two lines gives a ratio of ${r.toFixed(2)} (top quarter over median), ${wider} the ${rn.toFixed(2)} seen nationwide.`,
    ],
    seed,
    15
  );
}

// Where a household on the national median would land inside this state.
function nationalHouseholdHere(F: StateDeepDiveFacts, seed: number): string {
  const p = getStateIncomePercentile(F.state.fips, F.nat) ?? 50;
  const side = p < 50 ? "above" : p > 50 ? "below" : "at";
  return pick(
    [
      `Another way to read it: a household earning exactly the national median, ${formatUsd(F.nat)}, would rank around the top ${p}% in ${F.state.name} — ${side} the state's own midpoint.`,
      `Move a typical American household (${formatUsd(F.nat)} a year) to ${F.state.name} and it would sit near the top ${p}% of local households.`,
      `On ${F.state.name}'s distribution, the national median income of ${formatUsd(F.nat)} corresponds to roughly the top ${p}%.`,
      `If your household earns the US median of ${formatUsd(F.nat)}, you'd be about top ${p}% among ${F.state.name} households, ${side} the middle.`,
    ],
    seed,
    13
  );
}

function dataNote(F: StateDeepDiveFacts, seed: number): string {
  const records = F.ages.reduce((a, b) => a + b.rawCount, 0).toLocaleString("en-US");
  const nc = F.counties.length;
  return pick(
    [
      `About the numbers: household figures are the Census Bureau's ${acs5YearRange} American Community Survey five-year estimates for ${F.state.name} and its ${nc} counties; the earnings-by-age table comes from ${records} individual survey records in the same period, in 2024 dollars.`,
      `Sources for this section: ACS ${acs5YearRange} five-year tables for household income (state and ${nc} counties), plus ${records} person-level microdata records for the age breakdown. Groups under 100 records are left blank.`,
      `The household medians and thresholds use the ${acs5YearRange} ACS five-year estimates; the age table is built from ${records} ${F.state.name} survey records of people 25 and older with earnings.`,
      `Everything here comes from the Census's ${acs5YearRange} American Community Survey: published tables for households across ${nc} counties, and ${records} microdata records for personal earnings by age.`,
    ],
    seed,
    14
  );
}

function trendPara(F: StateDeepDiveFacts, seed: number): string | null {
  const one = F.oneYear?.medianHouseholdIncome;
  if (!one || !F.oneYear) return null;
  const d = ((one - F.median) / F.median) * 100;
  return pick(
    [
      `The single-year ${F.oneYear.year} estimate puts the median at ${formatUsd(one)}, ${signedPct(d)} versus the five-year figure. The five-year number pools ${acs5YearRange} and is steadier; the one-year number is more current but has a wider margin of error.`,
      `For a more recent snapshot, the ${F.oneYear.year} one-year survey shows ${formatUsd(one)} (${signedPct(d)} against the ${acs5YearRange} average). We use the five-year figure elsewhere because it's more reliable for smaller areas.`,
      `The latest one-year estimate (${F.oneYear.year}) is ${formatUsd(one)}, ${signedPct(d)} relative to the pooled ${acs5YearRange} median of ${formatUsd(F.median)}.`,
      `Comparing the two Census products: ${formatUsd(one)} in the ${F.oneYear.year} one-year estimate, ${formatUsd(F.median)} in the ${acs5YearRange} five-year estimate (${signedPct(d)}).`,
    ],
    seed,
    6
  );
}

export function buildStateDeepDive(state: StateMeta, counties: Pick<UsCountyIncome, "fips" | "name" | "medianHouseholdIncome">[]): SeoPage | null {
  const F = stateDeepDiveFacts(state, counties);
  if (!F) return null;
  const seed = seedOf(state.abbr + "state");
  const paragraphsHousehold = householdPara(F, seed);
  const trend = trendPara(F, seed);
  const sections: SeoPage["sections"] = [
    { heading: `How ${state.name} compares`, paragraphs: [overview(F, seed), versusNation(F, seed), ...(trend ? [trend] : [])] },
    {
      heading: `Income thresholds in ${state.name}`,
      paragraphs: [thresholdPara(F, seed), nationalHouseholdHere(F, seed), ...(spreadPara(F, seed) ? [spreadPara(F, seed) as string] : [])],
      table: {
        caption: `Household income needed to reach each line in ${state.name} (${acs5YearRange})`,
        head: ["Line", "Household income"],
        rows: F.thresholds.map((x) => [x.t === 50 ? "Median (top 50%)" : `Top ${x.t}%`, x.value != null ? formatUsd(x.value) : "Above $200,000 (top bracket)"]),
      },
    },
    {
      heading: "Earnings by age",
      paragraphs: [agePara(F, seed)],
      table: {
        head: ["Age", state.name, "United States"],
        rows: F.ages.map((a) => [a.label, a.state != null ? formatUsd(a.state) : "—", a.nation != null ? formatUsd(a.nation) : "—"]),
      },
    },
    ...(paragraphsHousehold ? [{ heading: "Married vs. single households", paragraphs: [paragraphsHousehold] }] : []),
    {
      heading: `Highest- and lowest-income counties in ${state.name}`,
      paragraphs: [countyPara(F, seed), ...(countyCount(F, seed) ? [countyCount(F, seed) as string] : [])],
      table:
        F.counties.length >= 10
          ? {
              head: ["Highest", "Median", "Lowest", "Median"],
              rows: [0, 1, 2, 3, 4].map((i) => {
                const hi = F.counties[i];
                const lo = F.counties[F.counties.length - 1 - i];
                return [hi.name, formatUsd(hi.median), lo.name, formatUsd(lo.median)];
              }),
            }
          : { head: ["County", "Median household income"], rows: F.counties.map((c) => [c.name, formatUsd(c.median)]) },
    },
    { heading: "About these numbers", paragraphs: [dataNote(F, seed)] },
  ];
  return {
    path: `/us/${state.abbr}`,
    kind: "state",
    title: "",
    description: "",
    h1: "",
    lede: pick(
      [
        `A closer look at household income in ${state.name}: how it ranks among the states, what it takes to reach the top 25% or 10%, how earnings change with age, and how far apart its ${F.counties.length} ${F.counties.length === 1 ? "county is" : "counties are"}.`,
        `This section digs into ${state.name}'s income figures — the ${formatUsd(F.median)} median, the thresholds for the top of the distribution, earnings by age, and the gap between its richest and poorest counties.`,
        `Below, ${state.name}'s numbers in more depth: where its ${formatUsd(F.median)} median ranks, the income lines for the top quarter and top tenth, a by-age earnings table, and county comparisons.`,
        `How does ${state.name} stack up? The figures below cover its rank among the states, income thresholds, earnings by age group and the spread across ${F.counties.length} ${F.counties.length === 1 ? "county" : "counties"}.`,
      ],
      seed,
      16
    ),
    sections,
    midAdAfter: 2,
    related: [],
    breadcrumbs: [],
    sources: [],
    dataFields: { median: F.median, nat: F.nat, rank: F.rank?.rank ?? null, topShare: F.topBracketShare, t50: F.thresholds[0].value, ageKnown: F.ages.filter((a) => a.state != null).length || null },
  };
}
