// Real, source-cited population figure for the "about how many people
// share your income bracket" line on the result headline (see
// lib/percentileTable.ts's estimateBandPopulation, which turns this into an
// actual household count for whichever income bracket the visitor falls
// into) — never a made-up round number.
//
// Source: US Census Bureau, American Community Survey (ACS) 2024 1-Year
// Estimates, Table B11001 (Total Households): 132,737,146 households,
// margin of error ±140,273 (verified live 2026-08-13).
// https://data.census.gov/table?q=B11001
//
// A different vintage than this app's ACS 2020-2024 5-Year income anchors
// (see acs5YearRange in lib/usIncomeCalc.ts) — the total household count
// doesn't move enough year to year for that gap to matter for a "roughly
// how many people" estimate, but it's still a mixed-vintage figure worth
// flagging rather than quietly treating as the same survey.
export const US_TOTAL_HOUSEHOLDS_2024 = 132_737_146;
