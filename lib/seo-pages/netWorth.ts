// /us/net-worth/[bracket] (the SCF's six age-of-reference-person brackets)
// and the /us/net-worth hub. Built from data/us/netWorthByAgeScf.json (SCF
// 2022 Table 2 medians/means, plus 2019 for the change) and the nationwide
// SCF percentile curve (data/us/netWorthPercentilesUS.json).
//
// Threshold lines use the same method the calculator uses for "net worth vs.
// people your age" (lib/usIncomeCalc.ts getUsNetWorthPercentileForAgeBand):
// the national curve re-centered on the bracket's published median. So the
// 50% line equals the published median exactly, and the other lines are
// modeled, which the page says.
import scf from "@/data/us/netWorthByAgeScf.json";
import netWorthPercentilesUS from "@/data/us/netWorthPercentilesUS.json";
import { getValueAtPercentile, type PercentileAnchor } from "@/lib/percentileTable";
import { getUsNetWorthPercentile, netWorthScaleForMedian } from "@/lib/usIncomeCalc";
import { formatUsd } from "@/lib/usFormat";
import { pct, pick, seedOf, signedPct, type SeoPage } from "@/lib/seo-pages/model";

const SOURCE = "Federal Reserve, Changes in U.S. Family Finances from 2019 to 2022 (Survey of Consumer Finances), Table 2 — family net worth by age of reference person, 2022 dollars";
const SOURCE_CURVE = "Federal Reserve, 2022 Survey of Consumer Finances — nationwide net worth percentiles";

export type ScfBracket = (typeof scf.brackets)[number];
export const NET_WORTH_BRACKETS: ScfBracket[] = scf.brackets;
export function netWorthBracket(id: string) {
  return NET_WORTH_BRACKETS.find((b) => b.id === id) ?? null;
}

const anchors = netWorthPercentilesUS.percentileAnchors as PercentileAnchor[];
export function bracketThreshold(b: ScfBracket, topPercent: number): number {
  return Math.round((getValueAtPercentile(anchors, topPercent) ?? NaN) / netWorthScaleForMedian(b.median2022));
}

const who: Record<string, string> = {
  "under-35": "families headed by someone under 35",
  "35-44": "families headed by someone aged 35 to 44",
  "45-54": "families headed by someone aged 45 to 54",
  "55-64": "families headed by someone aged 55 to 64",
  "65-74": "families headed by someone aged 65 to 74",
  "75-plus": "families headed by someone 75 or older",
};

// One bracket-specific paragraph each — written per life stage, not templated.
const lifeStage: Record<string, string> = {
  "under-35": "Under 35, net worth is mostly about the first big balance-sheet events: paying down student loans, building an emergency fund, and for some, a first home. Debts often offset assets almost one-for-one, which is why a sizeable share of young families report a net worth near zero or below it. A first mortgage can swing the number sharply in either direction — the home is counted at market value, the loan at what's still owed.",
  "35-44": "Between 35 and 44 the picture usually shifts from paying off debt to accumulating assets. Home equity starts to matter as mortgages amortize, and retirement accounts that were opened in a first job have had a decade or more to compound. It's also the age when the spread between families widens fastest: two households with similar incomes can sit far apart depending on when they bought a home and how early they started saving.",
  "45-54": "In the 45–54 bracket, net worth is shaped by peak earning years and by whatever sits in employer retirement plans. Many families in this range are also carrying the costs of children — college savings or tuition — which can slow the build-up. Home equity is now often the single largest asset for middle-wealth families, while financial assets dominate at the top.",
  "55-64": "Ages 55 to 64 are the last full decade of work for most people, and the net worth figures reflect it: retirement balances are close to their highest, mortgages are often nearly paid off, and catch-up contributions are allowed. It's also where the distance between the median and the mean is large, because business owners and high earners have had decades for their assets to grow.",
  "65-74": "Between 65 and 74, most families are drawing down savings rather than adding to them, yet this bracket has the highest median net worth of any age group in the 2022 survey. Paid-off homes and accumulated retirement accounts explain much of that; Social Security and pensions, which aren't counted as assets here, cover a large share of spending for many.",
  "75-plus": "For families headed by someone 75 or older, net worth typically eases from its peak as savings fund retirement, health and long-term-care costs. The home is often the main remaining asset. The bracket also has survivorship effects — people who live longer tend to have had more resources — which helps explain why the figures stay well above those of younger groups.",
};

function intro(b: ScfBracket, seed: number): string {
  const all = scf.allFamilies.median2022;
  const r = b.median2022 / all;
  const comp =
    r >= 1.5
      ? `${r.toFixed(1)} times the ${formatUsd(all)} median for all US families`
      : r >= 1.05
        ? `${pct((r - 1) * 100)} above the ${formatUsd(all)} median for all US families`
        : r > 0.95
          ? `close to the ${formatUsd(all)} median for all US families`
          : `${pct((1 - r) * 100)} below the ${formatUsd(all)} median for all US families`;
  return pick(
    [
      `The median net worth of ${who[b.id]} was ${formatUsd(b.median2022)} in 2022 — ${comp}. Half of these families had more and half had less.`,
      `For ${who[b.id]}, the midpoint of net worth in the Federal Reserve's 2022 survey is ${formatUsd(b.median2022)}, which is ${comp}.`,
      `A family in the ${b.label} bracket sitting exactly in the middle had a net worth of about ${formatUsd(b.median2022)} in 2022, ${comp}.`,
      `${formatUsd(b.median2022)}: that's the 2022 median net worth for ${who[b.id]}, ${comp}.`,
    ],
    seed
  );
}

function skew(b: ScfBracket, seed: number): string {
  const r = b.mean2022 / b.median2022;
  const lines =
    r >= 4
      ? [
          `The average (mean) is far higher, ${formatUsd(b.mean2022)} — ${r.toFixed(1)} times the median. A relatively small number of very wealthy families pulls the average up, so the median is the better guide to a typical family.`,
          `Don't confuse it with the mean of ${formatUsd(b.mean2022)}, which is ${r.toFixed(1)}× larger. Wealth is so concentrated at this age that the average describes almost nobody.`,
          `The mean, ${formatUsd(b.mean2022)}, runs ${r.toFixed(1)} times the median: a handful of large fortunes lift it well above what most families hold.`,
          `At ${formatUsd(b.mean2022)}, the average is ${r.toFixed(1)}× the median — a sign of how lopsided wealth is within this group.`,
        ]
      : [
          `The mean is ${formatUsd(b.mean2022)}, about ${r.toFixed(1)} times the median, so wealth is still concentrated, though less so than among younger families.`,
          `Average net worth comes to ${formatUsd(b.mean2022)} (${r.toFixed(1)}× the median); the gap reflects the top of the distribution rather than the typical family.`,
          `The ${formatUsd(b.mean2022)} mean is ${r.toFixed(1)} times the median — lopsided, but less extreme than at younger ages.`,
          `With a mean of ${formatUsd(b.mean2022)}, roughly ${r.toFixed(1)}× the median, the top of this bracket holds a large share of its wealth.`,
        ];
  return pick(lines, seed, 1);
}

function change(b: ScfBracket, seed: number): string {
  const dm = ((b.median2022 - b.median2019) / b.median2019) * 100;
  const da = ((b.mean2022 - b.mean2019) / b.mean2019) * 100;
  const big = dm >= 60;
  return pick(
    big
      ? [
          `It rose sharply from the 2019 survey, when the median was ${formatUsd(b.median2019)} in 2022 dollars — a ${signedPct(dm)} real increase, while the mean moved ${signedPct(da)}. Rising home and stock prices and pandemic-era savings drove gains across most groups.`,
          `Three years earlier, in 2019, the inflation-adjusted median was ${formatUsd(b.median2019)}. The ${signedPct(dm)} jump is one of the largest of any age group (the mean changed ${signedPct(da)}).`,
          `Compared with 2019 (${formatUsd(b.median2019)} after inflation), the median grew ${signedPct(dm)}; the average changed by ${signedPct(da)} over the same period.`,
          `The 2019 median, adjusted to 2022 dollars, was ${formatUsd(b.median2019)}, so typical wealth climbed ${signedPct(dm)} in three years; the mean went ${signedPct(da)}.`,
        ]
      : [
          `Between the 2019 and 2022 surveys the median moved from ${formatUsd(b.median2019)} to ${formatUsd(b.median2022)} in 2022 dollars (${signedPct(dm)}), and the mean changed ${signedPct(da)}.`,
          `After inflation, the median was ${formatUsd(b.median2019)} in 2019, so the 2022 figure is ${signedPct(dm)} different; the average shifted ${signedPct(da)}.`,
          `The change since 2019 is ${signedPct(dm)} at the median (from ${formatUsd(b.median2019)}) and ${signedPct(da)} at the mean, both in inflation-adjusted terms.`,
          `In 2019 the inflation-adjusted median stood at ${formatUsd(b.median2019)}; the ${signedPct(dm)} move to 2022 was ${dm > 0 ? "a real gain" : "a real decline"}, and the mean moved ${signedPct(da)}.`,
        ],
    seed,
    2
  );
}

// How lopsided the bracket was in 2019 vs 2022.
function skewChange(b: ScfBracket, seed: number): string {
  const r19 = b.mean2019 / b.median2019;
  const r22 = b.mean2022 / b.median2022;
  const narrowed = r22 < r19;
  return pick(
    [
      `The gap between average and typical wealth ${narrowed ? "narrowed" : "widened"} too: the mean was ${r19.toFixed(1)} times the median in 2019 and ${r22.toFixed(1)} times in 2022${narrowed ? ", meaning gains reached the middle faster than the top" : ", with the top pulling further ahead"}.`,
      `In 2019 the mean stood at ${r19.toFixed(1)}× the median; by 2022 that ratio was ${r22.toFixed(1)}×, so wealth in this bracket became ${narrowed ? "a little less" : "more"} concentrated.`,
      `Concentration shifted as well — a mean-to-median ratio of ${r19.toFixed(1)} in 2019 against ${r22.toFixed(1)} in 2022.`,
      `Comparing the two surveys, the mean went from ${r19.toFixed(1)} to ${r22.toFixed(1)} times the median, ${narrowed ? "a sign the typical family caught up somewhat" : "a sign the wealthiest families gained the most"}.`,
    ],
    seed,
    10
  );
}

function thresholds(b: ScfBracket, seed: number): string {
  const t25 = bracketThreshold(b, 25);
  const t10 = bracketThreshold(b, 10);
  const t1 = bracketThreshold(b, 1);
  return `${pick(
    [
      `To be in the top quarter of ${who[b.id]} you'd need roughly ${formatUsd(t25)}; the top 10% starts near ${formatUsd(t10)}, and the top 1% near ${formatUsd(t1)}.`,
      `Our modeled thresholds for this age group: about ${formatUsd(t25)} for the top 25%, ${formatUsd(t10)} for the top 10%, and ${formatUsd(t1)} for the top 1%.`,
      `Moving up the distribution, the lines fall at approximately ${formatUsd(t25)} (top 25%), ${formatUsd(t10)} (top 10%) and ${formatUsd(t1)} (top 1%).`,
      `The top-25% line sits around ${formatUsd(t25)}, the top-10% line around ${formatUsd(t10)}, and joining the top 1% takes roughly ${formatUsd(t1)}.`,
    ],
    seed,
    3
  )} The Fed publishes only the median and mean by age, so these lines are estimated by re-centering the nationwide SCF distribution on this bracket's median — the same method our calculator uses. Treat them as approximate, especially the top 1%.`;
}

function neighbors(b: ScfBracket, seed: number): string {
  const i = NET_WORTH_BRACKETS.findIndex((x) => x.id === b.id);
  const prev = NET_WORTH_BRACKETS[i - 1];
  const next = NET_WORTH_BRACKETS[i + 1];
  const parts: string[] = [];
  if (prev) {
    const d = ((b.median2022 - prev.median2022) / prev.median2022) * 100;
    parts.push(
      pick(
        [
          `Compared with the ${prev.label} bracket (${formatUsd(prev.median2022)}), the median is ${signedPct(d)}.`,
          `That's ${signedPct(d)} versus families one bracket younger (${prev.label}, ${formatUsd(prev.median2022)}).`,
          `One age bracket earlier, ${prev.label}, the median was ${formatUsd(prev.median2022)} — a ${signedPct(d)} difference.`,
          `Against the ${prev.label} group's ${formatUsd(prev.median2022)}, this is a ${signedPct(d)} change.`,
        ],
        seed,
        4
      )
    );
  }
  if (next) {
    const d = ((next.median2022 - b.median2022) / b.median2022) * 100;
    parts.push(
      pick(
        [
          `The next bracket, ${next.label}, has a median of ${formatUsd(next.median2022)} (${signedPct(d)}).`,
          `Looking ahead, families aged ${next.label} report ${formatUsd(next.median2022)}, ${signedPct(d)} from here.`,
          `For the ${next.label} group the median is ${formatUsd(next.median2022)}, ${signedPct(d)} relative to this one.`,
          `The ${next.label} median, ${formatUsd(next.median2022)}, is ${signedPct(d)} compared with this bracket.`,
        ],
        seed,
        5
      )
    );
  }
  parts.push(
    "These are different families at a single point in time, not the same families followed over the years, so the steps between brackets also reflect generational differences in home buying, education and market timing."
  );
  return parts.join(" ");
}

// Where this bracket's typical family sits among ALL US families.
function versusEveryone(b: ScfBracket, seed: number): string {
  const p = getUsNetWorthPercentile(b.median2022);
  const t10 = bracketThreshold(b, 10);
  const pt10 = getUsNetWorthPercentile(t10);
  return `${pick(
    [
      `Set against every family in the country regardless of age, a net worth of ${formatUsd(b.median2022)} would rank around the top ${p}%.`,
      `Measured against all US families, not just this age group, the ${b.label} median lands near the top ${p}%.`,
      `On the all-ages distribution, ${formatUsd(b.median2022)} corresponds to roughly the top ${p}% of families.`,
      `If you compared this bracket's typical family with everyone else, ${formatUsd(b.median2022)} would place it about top ${p}% nationally.`,
    ],
    seed,
    8
  )} ${pick(
    [
      `And this bracket's top-10% line, ${formatUsd(t10)}, would be about top ${pt10}% across all ages.`,
      `Its estimated top-10% threshold of ${formatUsd(t10)} works out to roughly the top ${pt10}% of all families.`,
      `The ${formatUsd(t10)} needed for this bracket's top 10% equals about the top ${pt10}% overall.`,
      `By the same yardstick, the bracket's top-10% line (${formatUsd(t10)}) sits near the top ${pt10}% of all US families.`,
    ],
    seed,
    9
  )} That's why the same dollar figure can feel very different depending on your age.`;
}

function method(b: ScfBracket, seed: number): string {
  return pick(
    [
      `Net worth here is everything a family owns — homes at market value, retirement and bank accounts, stocks, businesses, vehicles — minus everything it owes. Age is that of the family's "reference person", usually the main earner. Figures are the Federal Reserve's 2022 Survey of Consumer Finances in 2022 dollars; the ${b.label} medians are as published (${formatUsd(b.median2022)} in 2022, ${formatUsd(b.median2019)} in 2019).`,
      `About the source: the Survey of Consumer Finances interviews several thousand families every three years and oversamples wealthy households so the top is measured well. "Net worth" counts all assets minus all debts. The 2022 median for the ${b.label} bracket is ${formatUsd(b.median2022)}; future pension and Social Security income aren't included as assets.`,
      `Definitions: assets (home, other real estate, retirement and investment accounts, cash, vehicles, business equity) minus debts (mortgages, student and auto loans, credit cards). The SCF reports by age of the family's reference person; the ${b.label} values used here are ${formatUsd(b.median2022)} (median) and ${formatUsd(b.mean2022)} (mean) for 2022.`,
      `Reading the data: "family" in the SCF is close to "household". Values include home equity and retirement accounts but not the value of future Social Security or defined-benefit pensions. All amounts are in 2022 dollars; for the ${b.label} group the survey reports a ${formatUsd(b.median2022)} median and ${formatUsd(b.mean2022)} mean.`,
    ],
    seed,
    6
  );
}

export function buildNetWorthPage(b: ScfBracket): SeoPage {
  const seed = seedOf(b.id + "nw");
  const pagePath = `/us/net-worth/${b.id}`;
  const rows = [50, 25, 10, 1].map((t) => [t === 50 ? "Median (top 50%)" : `Top ${t}% starts at`, formatUsd(t === 50 ? b.median2022 : bracketThreshold(b, t))]);
  const i = NET_WORTH_BRACKETS.findIndex((x) => x.id === b.id);
  const siblings = NET_WORTH_BRACKETS.filter((x) => x.id !== b.id);
  return {
    path: pagePath,
    kind: "netWorth",
    title: `Net Worth at ${b.label === "75 and older" ? "75+" : b.label}: Median ${formatUsd(b.median2022)}, Top 10% ${formatUsd(bracketThreshold(b, 10))} (2022 SCF)`,
    description: `Median net worth for families headed by someone ${b.label === "Under 35" ? "under 35" : b.label === "75 and older" ? "75 or older" : `aged ${b.label}`} is ${formatUsd(b.median2022)}; the mean is ${formatUsd(b.mean2022)}. See top 25%, 10% and 1% lines and the change since 2019.`,
    h1: `Net worth ${b.id === "under-35" ? "under 35" : b.id === "75-plus" ? "at 75 and older" : `at ${b.label}`}`,
    lede: pick(
      [
        `Where does a typical family stand at this age, and what does it take to be near the top? The numbers below come from the Federal Reserve's 2022 Survey of Consumer Finances, which the Fed runs every three years.`,
        `A look at household wealth for the ${b.label} age bracket: the median, the average, the change since 2019, and estimated lines for the top 25%, 10% and 1% — all from the Federal Reserve's 2022 survey.`,
        `How much are families in the ${b.label} bracket worth? Here is what the Federal Reserve's latest wealth survey shows, from the typical family up to the top 1%.`,
        `Net worth figures for the ${b.label} age group, straight from the Survey of Consumer Finances, with context on what drives them and how they compare with other ages.`,
      ],
      seed,
      7
    ),
    sections: [
      {
        heading: "The typical family",
        paragraphs: [intro(b, seed), skew(b, seed)],
        table: { caption: `Net worth, ${b.label} (2022 dollars)`, head: ["Line", "Net worth"], rows },
      },
      { heading: "How it changed since 2019", paragraphs: [change(b, seed), skewChange(b, seed)], table: { head: ["", "2019", "2022"], rows: [["Median", formatUsd(b.median2019), formatUsd(b.median2022)], ["Mean", formatUsd(b.mean2019), formatUsd(b.mean2022)]] } },
      { heading: "What it takes to reach the top", paragraphs: [thresholds(b, seed), versusEveryone(b, seed)] },
      {
        heading: "Compared with other ages",
        paragraphs: [neighbors(b, seed)],
        bars: NET_WORTH_BRACKETS.map((x) => ({ label: x.label, value: x.median2022, display: formatUsd(x.median2022), highlight: x.id === b.id })),
      },
      { heading: "What shapes net worth at this stage", paragraphs: [lifeStage[b.id]] },
      { heading: "About the data", paragraphs: [method(b, seed)] },
    ],
    midAdAfter: 2,
    related: [
      ...siblings.map((x) => ({ href: `/us/net-worth/${x.id}`, label: `Net worth ${x.id === "under-35" ? "under 35" : `at ${x.label}`}` })),
      { href: "/us/net-worth", label: "Net worth by age: all brackets" },
      { href: "/us/insights/net-worth-by-age-benchmarks", label: "Net worth by age: benchmarks article" },
      { href: "/us/occupations", label: "Salary by occupation" },
    ],
    cta: {
      href: `/us/net-worth/${b.id}/calculate`,
      label: "See where your net worth ranks",
      body: `Opens the calculator set to the ${i <= 0 ? "25–34" : b.appBand === "65plus" ? "65+" : b.label} age band with the net worth field open. Nothing you type is put in the link.`,
    },
    breadcrumbs: [
      { name: "Home", path: "/us" },
      { name: "Net worth by age", path: "/us/net-worth" },
      { name: b.label, path: pagePath },
    ],
    sources: [SOURCE, SOURCE_CURVE],
    dataFields: { median: b.median2022, mean: b.mean2022, median2019: b.median2019, t10: bracketThreshold(b, 10), t1: bracketThreshold(b, 1) },
  };
}

export function buildNetWorthHub(): SeoPage {
  const peak = NET_WORTH_BRACKETS.reduce((a, b) => (b.median2022 > a.median2022 ? b : a));
  const young = NET_WORTH_BRACKETS[0];
  const growth = ((peak.median2022 - young.median2022) / young.median2022) * 100;
  const fastest = NET_WORTH_BRACKETS.map((b) => ({ b, d: (b.median2022 - b.median2019) / b.median2019 })).reduce((a, x) => (x.d > a.d ? x : a));
  return {
    path: "/us/net-worth",
    kind: "netWorthHub",
    title: "Net Worth by Age: Median, Mean and Top 10% for Every Age Bracket (2022 SCF)",
    description: `Median US family net worth ranges from ${formatUsd(young.median2022)} under 35 to ${formatUsd(peak.median2022)} at ${peak.label}. Compare medians, means and top-10% lines by age.`,
    h1: "Net worth by age",
    lede: `Wealth builds slowly and unevenly over a lifetime. These pages break down the Federal Reserve's 2022 Survey of Consumer Finances by the age of the family's main earner.`,
    sections: [
      {
        heading: "The shape of the curve",
        paragraphs: [
          `Median family net worth climbs from ${formatUsd(young.median2022)} for families headed by someone under 35 to a peak of ${formatUsd(peak.median2022)} in the ${peak.label} bracket — a ${pct(growth)} difference — before easing to ${formatUsd(NET_WORTH_BRACKETS[5].median2022)} for those 75 and older. The averages are several times larger at every age, because wealth is concentrated: a minority of families hold most of it, which lifts the mean far above what a typical family has.`,
          `Every bracket gained ground between the 2019 and 2022 surveys after inflation, helped by higher home values and stock prices. The biggest jump was in the ${fastest.b.label} bracket, where the median rose ${pct(fastest.d * 100)} in real terms. Each page below covers one bracket in depth: the median and mean, estimated lines for the top 25%, 10% and 1%, how the numbers moved since 2019, and what typically drives wealth at that stage of life.`,
          `Net worth here means everything a family owns minus everything it owes — including home equity and retirement accounts, but not future Social Security or pension payments. If you'd like to see where your own figure lands, each page links to the calculator with the matching age band already selected; your numbers never leave your browser.`,
        ],
        table: {
          caption: "Family net worth by age of reference person, 2022",
          head: ["Age", "Median", "Mean", "Top 10% from (est.)"],
          rows: NET_WORTH_BRACKETS.map((b) => [b.label, formatUsd(b.median2022), formatUsd(b.mean2022), formatUsd(bracketThreshold(b, 10))]),
        },
      },
    ],
    midAdAfter: 1,
    related: NET_WORTH_BRACKETS.map((b) => ({ href: `/us/net-worth/${b.id}`, label: `Net worth ${b.id === "under-35" ? "under 35" : `at ${b.label}`}`, note: `${formatUsd(b.median2022)} median` })),
    breadcrumbs: [
      { name: "Home", path: "/us" },
      { name: "Net worth by age", path: "/us/net-worth" },
    ],
    sources: [SOURCE, SOURCE_CURVE],
    dataFields: { peak: peak.median2022, young: young.median2022 },
  };
}
