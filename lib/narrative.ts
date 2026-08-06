// Turns the /us result page's percentile numbers into a plain-language
// headline sentence — a more shareable "hook" to sit above the existing
// "Top in this county / XX%" hero numbers, which stay as the primary,
// literal stat. Pure function, no React — safe to unit-test or reuse in the
// share card later.

export type ResultHeadlineInput = {
  countyPercentile?: number | null;
  nationwidePercentile?: number | null;
  agePercentile?: number | null;
  netWorthPercentile?: number | null;
  countyName?: string | null;
  ageBandLabel?: string | null;
};

export type Scope = "county" | "nationwide" | "age" | "netWorth";

type Candidate = { scope: Scope; percentile: number; place: string };

// What buildResultHeadline actually picked — callers that show the
// headline sentence next to a big percent number MUST use this percentile
// (and scope, to label it), not some other percentile of their own, or the
// two end up pointing at different metrics.
export type ResultHeadline = {
  text: string;
  scope: Scope;
  percentile: number;
  place: string;
};

type TierTemplate = (pct100: number, subject: string, median: string) => string;

function subjectPhrase(scope: Scope, place: string): string {
  switch (scope) {
    case "county":
      return `people in ${place}`;
    case "nationwide":
      return "people nationwide";
    case "age":
      return `people your age (${place}) nationwide`;
    case "netWorth":
      return "Americans";
  }
}

function medianPhrase(scope: Scope, place: string): string {
  switch (scope) {
    case "county":
      return `the ${place} median`;
    case "nationwide":
      return "the nationwide median";
    case "age":
      return `the median for people your age (${place})`;
    case "netWorth":
      return "the median net worth";
  }
}

// Each tier keeps a small array of phrasings rather than a single string —
// only the first is used today, but new variants can be appended later
// (e.g. to rotate for repeat visitors) without touching the selection logic.
const EARN_TIERS: { strong: TierTemplate[]; mid: TierTemplate[]; mild: TierTemplate[] } = {
  strong: [
    (pct100, subject) => `You out-earn ${pct100}% of ${subject}.`,
    (pct100, subject) => `You're ahead of ${pct100}% of ${subject}.`,
  ],
  mid: [(pct100, subject) => `You earn more than ${pct100}% of ${subject}.`],
  mild: [(pct100, subject, median) => `You're within reach of ${median} — ${pct100}% of ${subject} earn less than you.`],
};

const NET_WORTH_TIERS: { strong: TierTemplate[]; mid: TierTemplate[]; mild: TierTemplate[] } = {
  strong: [(pct100, subject) => `Your net worth beats ${pct100}% of ${subject}.`],
  mid: [(pct100, subject) => `Your net worth is higher than ${pct100}% of ${subject}.`],
  mild: [(pct100, subject, median) => `You're within reach of ${median} — ${pct100}% of ${subject} have less than you.`],
};

function sentenceFor(candidate: Candidate): string {
  const { scope, percentile, place } = candidate;
  const pct100 = Math.max(1, Math.min(99, 100 - percentile));
  const subject = subjectPhrase(scope, place);
  const median = medianPhrase(scope, place);
  const tiers = scope === "netWorth" ? NET_WORTH_TIERS : EARN_TIERS;

  // Top % is "how good", not "how big" — lower is better.
  const templates = percentile <= 10 ? tiers.strong : percentile <= 50 ? tiers.mid : tiers.mild;
  return templates[0](pct100, subject, median);
}

// Picks whichever of county/nationwide/age is most impressive (lowest top-%
// value) and turns it into a sentence. Falls back to net worth only when
// none of the three income comparisons are available (e.g. no county data).
// Returns the winning scope/percentile alongside the sentence so callers
// can show a matching number instead of a different metric of their own.
export function buildResultHeadline(input: ResultHeadlineInput): ResultHeadline | null {
  const candidates: Candidate[] = [];
  if (input.countyPercentile != null && input.countyName) {
    candidates.push({ scope: "county", percentile: input.countyPercentile, place: input.countyName });
  }
  if (input.nationwidePercentile != null) {
    candidates.push({ scope: "nationwide", percentile: input.nationwidePercentile, place: "" });
  }
  if (input.agePercentile != null && input.ageBandLabel) {
    candidates.push({ scope: "age", percentile: input.agePercentile, place: input.ageBandLabel });
  }

  let best: Candidate | null = null;
  for (const c of candidates) {
    if (!best || c.percentile < best.percentile) best = c;
  }

  if (!best && input.netWorthPercentile != null) {
    best = { scope: "netWorth", percentile: input.netWorthPercentile, place: "" };
  }

  return best ? { text: sentenceFor(best), scope: best.scope, percentile: best.percentile, place: best.place } : null;
}
