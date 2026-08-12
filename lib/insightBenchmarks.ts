// Real, source-cited benchmarks for the "coaching insight" module
// (lib/insightMessages.ts). Every numeric constant below must trace to the
// citation in its own comment — never add a number here without one, and
// never let lib/insightMessages.ts state a statistic that isn't rooted in
// one of these constants or in data/us/netWorthByAge.json /
// data/us/401kByAge.json (already-cited SCF/Vanguard age-band tables).
import type { UsAgeBandId } from "@/lib/usInput";

// ── Fidelity age-based savings multiplier guideline ─────────────────────
// Source: Fidelity Viewpoints, "How much do I need to retire?"
// https://www.fidelity.com/viewpoints/retirement/how-much-do-i-need-to-retire
// (verified live 2026-08-11): "Aim to save at least 1x your income by 30,
// 3x by 40, 6x by 50, and 8x by 60," with an overarching goal of "10x your
// preretirement income by age 67." The guideline assumes saving starts at
// 25, a combined (employee + employer) 15% annual savings rate, more than
// 50% lifetime equity allocation, and maintaining your current lifestyle
// in retirement — not universal facts, just Fidelity's modeled assumptions.
export const FIDELITY_SAVINGS_MULTIPLIER_MILESTONES = [
  { age: 30, multiplier: 1 },
  { age: 40, multiplier: 3 },
  { age: 50, multiplier: 6 },
  { age: 60, multiplier: 8 },
  { age: 67, multiplier: 10 },
] as const;

// Maps this app's 6 age bands (see lib/usInput.ts / data/us/401kByAge.json)
// onto the nearest Fidelity milestone above, the same way
// data/us/netWorthByAge.json documents its own bracket remapping. "under25"
// has no target: Fidelity's guideline starts at 30, so callers must handle
// that band as "no numeric target yet" rather than inventing one.
export const AGE_BAND_TO_SAVINGS_MULTIPLIER_TARGET: Partial<Record<UsAgeBandId, number>> = {
  "25-34": 1, // nearest milestone: age 30
  "35-44": 3, // age 40
  "45-54": 6, // age 50
  "55-64": 8, // age 60
  "65plus": 10, // age 67
};

// ── IRS retirement account catch-up contributions, 2026 ─────────────────
// Source: IRS Newsroom, "401(k) limit increases to $24,500 for 2026, IRA
// limit increases to $7,500" (Notice 2025-67):
// https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
// (verified live 2026-08-11).
export const IRS_2026_401K_LIMITS = {
  standardLimit: 24500,
  catchUp50Plus: 8000, // additional amount for participants who are 50+ (ages 60-63 use the enhanced tier below instead)
  catchUpSuper60to63: 11250, // "super catch-up" for ages 60-63 specifically, in lieu of the standard $8,000 add-on
  totalWithCatchUp50Plus: 32500, // 24,500 + 8,000
  totalWithSuperCatchUp: 35750, // 24,500 + 11,250
} as const;

// ── Federal Reserve: how many Americans feel on track on retirement ──────
// Source: Federal Reserve Board, "Report on the Economic Well-Being of U.S.
// Households in 2024" (published May 2025), Savings and Investments section:
// https://www.federalreserve.gov/publications/2025-economic-well-being-of-us-households-in-2024-savings-and-investments.htm
// (verified live 2026-08-11). Verbatim finding: "a lower 35 percent of
// non-retirees thought their retirement saving was on track" in 2024.
export const FED_SHED_RETIREMENT_ON_TRACK_PERCENT_2024 = 35;
