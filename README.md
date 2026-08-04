# 🇺🇸 US Income & Net Worth Percentile

Pick a state and county on the map (or search by name), enter your gender, marital status,
pre-tax income, net worth, and 401k balance, and see where you rank against real US Census
Bureau / Federal Reserve data — county, nationwide, and by age band. Every calculation runs
100% locally in the browser — no API calls, no backend.

---

## Data & calculation logic

- `data/us/stateIncome.json` / `data/us/countyIncome.json` / `data/us/nationalIncome.json` —
  median household income + percentile anchor tables per state/county/nation. Source: US
  Census Bureau ACS 5-Year (and, for states, latest 1-Year) estimates. Regenerate with
  `npm run fetch:census` (requires a Census API key, see `scripts/fetchCensusData.ts`).
- `data/us/netWorthPercentilesUS.json` — nationwide net worth percentile anchors. Source:
  Federal Reserve Survey of Consumer Finances.
- `data/us/401kByAge.json` — average/median 401k balance by age band. Source: Vanguard, How
  America Saves.
- `data/us/incomeByAge.json` / `data/us/netWorthByAge.json` — median income / average net
  worth by age band, used only to rescale a user's value against the nationwide percentile
  curve above ("top X% nationwide for your age") — see each file's `meta.note` for how the
  six age bands map onto the coarser brackets ACS/SCF actually publish.
- `lib/percentileTable.ts` — shared log-log interpolation percentile calculator.
- `lib/usIncomeCalc.ts` — looks up income/net worth/401k percentiles for a given
  state/county/age band from the data above.
- `lib/usInput.ts` — query-string codec for the input panel's answers, so they survive
  navigation from `/us` → `/us/[state]` → `/us/[state]/[county]`.

## Structure

```
app/
  page.tsx                              # redirects to /us
  us/
    page.tsx / UsHomeClient.tsx          # US map — pick a state
    [state]/page.tsx / UsStateClient.tsx  # county map for that state
    [state]/[county]/page.tsx / UsCountyClient.tsx  # county-level result
data/us/
  stateIncome.json / countyIncome.json / nationalIncome.json
  netWorthPercentilesUS.json / 401kByAge.json / stateMeta.ts
  incomeByAge.json / netWorthByAge.json
lib/
  usIncomeCalc.ts / usInput.ts / usFormat.ts / usGeo.ts / percentileTable.ts
  i18n.ts                                # ko/en copy
components/us/
  UsMap.tsx / UsGeoList.tsx / UsInputPanel.tsx / UsResultCard.tsx / UsShell.tsx
```

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy (Vercel)

```bash
vercel
```
