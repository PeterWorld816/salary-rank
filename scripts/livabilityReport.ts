// Prints the /us/where-to-live test cases, grade distribution by income, and
// Best/Hardest 10 — `npx tsx scripts/livabilityReport.ts`. Read-only.
import fs from "node:fs";
import path from "node:path";
import { scoreAll, scoreArea, gradeDistribution, GRADE_ORDER, type LivabilityData } from "../lib/livability";

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/data/livability.json"), "utf8")) as LivabilityData;
const metros = data.areas.filter((a) => a.type === "metro");
const byId = (id: string) => data.areas.find((a) => a.id === id)!;
const pct = (n: number) => `${Math.round(n * 100)}%`;

console.log("## Test cases (2 bedrooms)");
console.log("| case | income | rent/mo | burden | home value | P/I | RPP | Rent | Buy | Power | Living | grade | feels like |");
for (const [label, id, inc] of [
  ["San Francisco", "cbsa-41860", 80000],
  ["San Antonio", "cbsa-41700", 80000],
  ["New York", "cbsa-35620", 50000],
  ["Raleigh", "cbsa-39580", 300000],
  ["San Jose", "cbsa-41940", 80000],
] as const) {
  const s = scoreArea(byId(id), inc, 2)!;
  console.log(`| ${label} | $${inc / 1000}K | $${s.rent} | ${pct(s.rentBurden)} | $${s.area.homeValue} | ${s.priceToIncome.toFixed(2)} | ${s.area.rpp} | ${s.rentScore.toFixed(0)} | ${s.buyScore.toFixed(0)} | ${s.powerScore.toFixed(0)} | ${s.living.toFixed(1)} | ${s.grade} | $${Math.round(s.feelsLike)} |`);
}

console.log(`\n## Grade distribution, ${metros.length} metros, 2 bedrooms`);
console.log(`| income | ${GRADE_ORDER.join(" | ")} |`);
for (const inc of [40000, 80000, 150000, 300000, 600000]) {
  const s = scoreAll(metros, inc, 2);
  const d = gradeDistribution(s);
  console.log(`| $${inc / 1000}K | ${GRADE_ORDER.map((g) => pct(d[g] / s.length)).join(" | ")} |`);
}

if (process.argv.includes("--top")) {
  for (const inc of [40000, 80000, 150000, 300000]) {
    const s = scoreAll(metros, inc, 2);
    const row = (x: (typeof s)[number]) => `${x.area.name} (${x.living.toFixed(0)}, ${x.grade})`;
    console.log(`\n### $${inc / 1000}K — Best 10`);
    s.slice(0, 10).forEach((x, i) => console.log(`${i + 1}. ${row(x)}`));
    console.log(`### $${inc / 1000}K — Hardest 10`);
    s.slice(-10).reverse().forEach((x, i) => console.log(`${i + 1}. ${row(x)}`));
  }
}
