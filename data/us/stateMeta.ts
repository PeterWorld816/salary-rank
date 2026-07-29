// Static reference data — ANSI/Census FIPS codes for the 50 states + DC, and
// the 2-letter postal abbreviation we use as the /us/[state] route slug.
// This is fixed government reference data (not a statistic that changes),
// safe to hardcode unlike the actual income figures in data/us/*Income.json.

export type StateMeta = {
  fips: string; // 2-digit zero-padded, matches us-atlas topojson feature.id
  abbr: string; // lowercase in routes, e.g. "ca"
  name: string;
};

export const US_STATES: StateMeta[] = [
  { fips: "01", abbr: "al", name: "Alabama" },
  { fips: "02", abbr: "ak", name: "Alaska" },
  { fips: "04", abbr: "az", name: "Arizona" },
  { fips: "05", abbr: "ar", name: "Arkansas" },
  { fips: "06", abbr: "ca", name: "California" },
  { fips: "08", abbr: "co", name: "Colorado" },
  { fips: "09", abbr: "ct", name: "Connecticut" },
  { fips: "10", abbr: "de", name: "Delaware" },
  { fips: "11", abbr: "dc", name: "District of Columbia" },
  { fips: "12", abbr: "fl", name: "Florida" },
  { fips: "13", abbr: "ga", name: "Georgia" },
  { fips: "15", abbr: "hi", name: "Hawaii" },
  { fips: "16", abbr: "id", name: "Idaho" },
  { fips: "17", abbr: "il", name: "Illinois" },
  { fips: "18", abbr: "in", name: "Indiana" },
  { fips: "19", abbr: "ia", name: "Iowa" },
  { fips: "20", abbr: "ks", name: "Kansas" },
  { fips: "21", abbr: "ky", name: "Kentucky" },
  { fips: "22", abbr: "la", name: "Louisiana" },
  { fips: "23", abbr: "me", name: "Maine" },
  { fips: "24", abbr: "md", name: "Maryland" },
  { fips: "25", abbr: "ma", name: "Massachusetts" },
  { fips: "26", abbr: "mi", name: "Michigan" },
  { fips: "27", abbr: "mn", name: "Minnesota" },
  { fips: "28", abbr: "ms", name: "Mississippi" },
  { fips: "29", abbr: "mo", name: "Missouri" },
  { fips: "30", abbr: "mt", name: "Montana" },
  { fips: "31", abbr: "ne", name: "Nebraska" },
  { fips: "32", abbr: "nv", name: "Nevada" },
  { fips: "33", abbr: "nh", name: "New Hampshire" },
  { fips: "34", abbr: "nj", name: "New Jersey" },
  { fips: "35", abbr: "nm", name: "New Mexico" },
  { fips: "36", abbr: "ny", name: "New York" },
  { fips: "37", abbr: "nc", name: "North Carolina" },
  { fips: "38", abbr: "nd", name: "North Dakota" },
  { fips: "39", abbr: "oh", name: "Ohio" },
  { fips: "40", abbr: "ok", name: "Oklahoma" },
  { fips: "41", abbr: "or", name: "Oregon" },
  { fips: "42", abbr: "pa", name: "Pennsylvania" },
  { fips: "44", abbr: "ri", name: "Rhode Island" },
  { fips: "45", abbr: "sc", name: "South Carolina" },
  { fips: "46", abbr: "sd", name: "South Dakota" },
  { fips: "47", abbr: "tn", name: "Tennessee" },
  { fips: "48", abbr: "tx", name: "Texas" },
  { fips: "49", abbr: "ut", name: "Utah" },
  { fips: "50", abbr: "vt", name: "Vermont" },
  { fips: "51", abbr: "va", name: "Virginia" },
  { fips: "53", abbr: "wa", name: "Washington" },
  { fips: "54", abbr: "wv", name: "West Virginia" },
  { fips: "55", abbr: "wi", name: "Wisconsin" },
  { fips: "56", abbr: "wy", name: "Wyoming" },
];

const byFips = new Map(US_STATES.map((s) => [s.fips, s]));
const byAbbr = new Map(US_STATES.map((s) => [s.abbr, s]));

export function getStateByFips(fips: string): StateMeta | null {
  return byFips.get(fips) ?? null;
}

export function getStateByAbbr(abbr: string): StateMeta | null {
  return byAbbr.get(abbr.toLowerCase()) ?? null;
}
