// Every tunable number behind /us/where-to-live's scores and grades — change
// them here and nowhere else (lib/livability.ts reads only this file;
// `npx tsx scripts/livabilityReport.ts` prints the test cases and the grade
// distribution by income after any change).
//
// Each score runs from 100 at its "best" point to 0 at its "worst" point,
// clamped:
//   rent:  rent burden r = (median rent for the chosen bedrooms × 12) / income
//          — HUD's 30% "cost-burdened" line sits inside this range.
//   buy:   price-to-income p = median owner-occupied home value / income
//   power: BEA Regional Price Parity (US = 100) — always linear.
// `scale: "log"` puts rent and buy on a log scale between those points.
//
// Calibration (2026-10-30, 387 metros, 2 bedrooms): the starting values —
// linear, rent 15%→50%, buy 2.5×→10×, Royal at 80 — put 94% of metros in
// Royal at $150K and 100% at $600K, and San Antonio at $80K in Royal. Rent
// burden across metros spans ~1.4% (at $600K) to ~90% (at $40K), which a
// straight line through 15–50% can't spread. The values below keep every
// income's top grade under 80% and the four reference cases in line (see
// the report script).
export const LIVABILITY_CONSTANTS = {
  scale: "log" as "log" | "linear",
  rent: { best: 0.02, worst: 0.5 },
  buy: { best: 1.5, worst: 15 },
  power: { best: 85, worst: 115 },
  weights: { rent: 0.5, buy: 0.3, power: 0.2 },
  // LivingScore lower bounds, highest first. The last grade takes the rest.
  grades: [
    { id: "royal", min: 85 },
    { id: "comfortable", min: 65 },
    { id: "okay", min: 45 },
    { id: "tight", min: 25 },
    { id: "stretched", min: 0 },
  ],
  defaultBedrooms: 2,
} as const;
