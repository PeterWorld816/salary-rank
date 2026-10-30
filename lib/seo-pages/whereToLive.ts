// The explainer under the /us/where-to-live tool — how the score works, where
// the numbers come from, and what they leave out. Built as a SeoPage so the
// quality gate (scripts/seoQualityGate.ts) checks the same text that ships.
// Every figure is read from public/data/livability.json and run through
// lib/livability.ts — the same file and functions the tool itself uses.
import fs from "node:fs";
import path from "node:path";
import { formatUsd } from "@/lib/usFormat";
import { LIVABILITY_CONSTANTS as C } from "@/lib/livabilityConstants";
import { gradeDistribution, scoreAll, scoreArea, type AreaScore, type LivabilityData } from "@/lib/livability";
import { GRADE_LABELS } from "@/lib/livabilityGrades";
import type { SeoPage } from "@/lib/seo-pages/model";

export const WHERE_TO_LIVE_PATH = "/us/where-to-live";

export function loadLivability(): LivabilityData {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/livability.json"), "utf8")) as LivabilityData;
}

// Census publishes medians in the open-ended top bracket as the bracket edge.
function topcodedNote(areas: LivabilityData["areas"], sj: LivabilityData["areas"][number] | null): string {
  if (!areas.length) return "";
  if (areas.length === 1 && sj && areas[0] === sj && sj.flags.includes("rent3-topcoded"))
    return ` ${sj.name} reports its three-bedroom median gross rent as $3,500+, the top of the Census range, so the tool uses $3,500 there and marks it.`;
  return ` ${areas.length} areas have a median at the top of the Census range (${areas.map((a) => a.name).join("; ")}); the tool uses the range's edge there and marks it.`;
}

const pctOf = (x: number) => `${Math.round(x * 100)}%`;
const times = (x: number) => `${x.toFixed(1)}×`;

export function buildWhereToLivePage(data: LivabilityData = loadLivability()): SeoPage {
  const metros = data.areas.filter((a) => a.type === "metro");
  const byId = (id: string) => data.areas.find((a) => a.id === id) ?? null;
  const sf = byId("cbsa-41860");
  const sa = byId("cbsa-41700");
  const sj = byId("cbsa-41940");
  const sfScore = sf ? scoreArea(sf, 80000, 2) : null;
  const saScore = sa ? scoreArea(sa, 80000, 2) : null;
  const rppSorted = [...metros].sort((a, b) => b.rpp - a.rpp);
  const priciest = rppSorted[0];
  const cheapest = rppSorted[rppSorted.length - 1];
  const at80 = scoreAll(metros, 80000, 2);
  const at150 = scoreAll(metros, 150000, 2);
  const share = (s: AreaScore[], ids: string[]) => s.filter((x) => ids.includes(x.grade)).length / s.length;
  const dist80 = gradeDistribution(at80);
  const topcoded = data.areas.filter((a) => a.flags.some((f) => f.includes("topcoded")));
  const [, rpp, rent, value] = data.meta.sources;
  const downloaded = data.meta.generatedAt.slice(0, 10);
  const gradeLine = C.grades.map((g, i) => `${GRADE_LABELS[g.id].en} ${i === 0 ? `${g.min}+` : `${g.min}–${C.grades[i - 1].min - 1}`}`).join(", ");

  const page: SeoPage = {
    path: WHERE_TO_LIVE_PATH,
    kind: "livability",
    title: "Where Can Your Income Live Best? US Metro Affordability by Income",
    description: `Enter a pre-tax income and see how comfortably it covers rent and homes across ${metros.length} US metro areas, graded from Royal to Stretched with BEA price parities and Census rent and home values.`,
    h1: "Where can your income live best?",
    lede: `The same paycheck stretches very differently across the country. This tool takes one pre-tax income and scores it in all ${metros.length} metropolitan areas the Bureau of Economic Analysis publishes price levels for, using what a typical apartment rents for, what a typical home is worth, and how expensive everyday goods and services are there.`,
    sections: [
      {
        heading: "How the score works",
        paragraphs: [
          `Three measures go into each area's LivingScore. Rent burden is the area's median gross rent for the home size you pick (one, two or three bedrooms), times twelve, divided by your income. Price-to-income is the median value of owner-occupied homes divided by your income. Purchasing power is BEA's Regional Price Parity, where the US average is 100.`,
          `Rent burden counts for ${pctOf(C.weights.rent)} of the score, price-to-income for ${pctOf(C.weights.buy)} and purchasing power for ${pctOf(C.weights.power)}. Rent burden scores 100 at ${pctOf(C.rent.best)} of income or less and 0 at ${pctOf(C.rent.worst)} or more; price-to-income scores 100 at ${times(C.buy.best)} or less and 0 at ${times(C.buy.worst)} or more, both on a ${C.scale === "log" ? "logarithmic" : "linear"} scale in between. The price parity scores 100 at ${C.power.best} and 0 at ${C.power.worst}. HUD treats renters who spend more than 30% of income on housing as cost-burdened, and that line sits well inside the rent range here.`,
          `The grades are cut from the LivingScore: ${gradeLine}. They describe how much room your income has in a place, not the place itself — the same metro can be Royal for one income and Stretched for another.`,
        ],
      },
      {
        heading: "A worked example: $80,000 in two very different metros",
        paragraphs:
          sfScore && saScore && sf && sa
            ? [
                `Take $80,000 a year and a two-bedroom home. In ${sf.name}, the median two-bedroom gross rent is ${formatUsd(sfScore.rent)} a month, so a year of rent would use ${pctOf(sfScore.rentBurden)} of that income. The median home is valued at ${formatUsd(sf.homeValue!)}, ${times(sfScore.priceToIncome)} the income, and the price parity is ${sf.rpp.toFixed(1)}, so $80,000 buys about what ${formatUsd(Math.round(sfScore.feelsLike))} would at average US prices. The score lands at ${Math.round(sfScore.living)}, which is ${GRADE_LABELS[sfScore.grade].en}.`,
                `In ${sa.name} the same two-bedroom rent median is ${formatUsd(saScore.rent)}, or ${pctOf(saScore.rentBurden)} of income, the median home is ${formatUsd(sa.homeValue!)} (${times(saScore.priceToIncome)} income), and the parity of ${sa.rpp.toFixed(1)} makes $80,000 feel like ${formatUsd(Math.round(saScore.feelsLike))}. That scores ${Math.round(saScore.living)}, ${GRADE_LABELS[saScore.grade].en}. Nothing about either city changed between the two sentences; only where the income was spent did.`,
              ]
            : ["Example areas were not available in this data release."],
      },
      {
        heading: "How one income spreads across the country",
        paragraphs: [
          `At $80,000 with two bedrooms, ${pctOf(share(at80, ["royal", "comfortable"]))} of metros come out Comfortable or better, ${pctOf(dist80.okay / at80.length)} Okay, ${pctOf(dist80.tight / at80.length)} Tight and ${pctOf(dist80.stretched / at80.length)} Stretched. At $150,000 the Comfortable-or-better share rises to ${pctOf(share(at150, ["royal", "comfortable"]))}. Price levels alone vary a lot: ${priciest.name} has the highest metro price parity at ${priciest.rpp.toFixed(1)}, while ${cheapest.name} has the lowest at ${cheapest.rpp.toFixed(1)}.`,
          `Because rent and home prices are compared to your own income, the ranking order barely moves as income changes, but the grades do. That is the point of the tool: to show where a given income has slack, not to rank places as better or worse to live.`,
        ],
      },
      {
        heading: "Where the numbers come from",
        paragraphs: [
          `Price levels are the U.S. Bureau of Economic Analysis Regional Price Parities for ${data.meta.vintages.rpp}, "All items", from the state and metropolitan tables released ${data.meta.vintages.rppReleased}. Rents are Census American Community Survey ${data.meta.vintages.acs5} 5-year estimates, table B25031 (median gross rent by bedrooms); home values are table B25077 (median value of owner-occupied housing units). Median household income from table B19013 is shown for context only and is not part of the score.`,
          `The two sources are joined by metro (CBSA) code, never by name. All ${metros.length} metros in the BEA table matched an ACS area; micropolitan areas and Puerto Rico are not in the BEA table, so they are not scored. Files were downloaded ${downloaded}.${topcodedNote(topcoded, sj)}`,
        ],
      },
      {
        heading: "What the score leaves out",
        paragraphs: [
          `Everything here uses pre-tax income. State and local income taxes differ a lot, so the same gross income leaves different amounts to spend; none of that is in the score. Metro medians also hide big differences inside an area: a downtown two-bedroom and one at the far edge of the same metro can differ by more than the gap between two metros.`,
          `A median gross rent by bedrooms is what current renters of that size of home pay, including utilities they pay for, across everyone who rents, including people who signed leases years ago. Asking rents for a vacant apartment today are usually higher. The ACS figures are five-year averages, so they trail recent price changes.`,
          `This is an estimate built from public statistics, not financial, tax or relocation advice. Use it to see where an income has more or less room, then check real listings and your own costs before deciding anything.`,
        ],
      },
    ],
    midAdAfter: 2,
    related: [
      { href: "/us", label: "Your US income percentile" },
      { href: "/us/occupations", label: "Salary by occupation" },
      { href: "/us/insights/cost-of-living-vs-income", label: "Cost of living vs. income" },
    ],
    breadcrumbs: [
      { name: "US Income", path: "/us" },
      { name: "Where to live", path: WHERE_TO_LIVE_PATH },
    ],
    sources: [
      `${rpp.agency}, ${rpp.table}, ${rpp.year} (released ${rpp.released}); downloaded ${downloaded}.`,
      `${rent.agency}, ${rent.table}, ${rent.year}; downloaded ${downloaded}.`,
      `${value.agency}, ${value.table}, ${value.year}; downloaded ${downloaded}.`,
    ],
    dataFields: {
      metros: metros.length,
      sfRent: sfScore?.rent,
      saRent: saScore?.rent,
      sfRpp: sf?.rpp,
      saRpp: sa?.rpp,
      sfHome: sf?.homeValue,
      saHome: sa?.homeValue,
    },
  };
  return page;
}
