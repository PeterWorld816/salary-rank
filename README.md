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
middleware.ts                            # "/" -> /us or /kr by Accept-Language; /kr/* rewrites to /us/*
app/
  page.tsx                              # fallback redirect (middleware handles this first)
  us/
    page.tsx / UsHomeClient.tsx          # US map — pick a state
    [state]/page.tsx / UsStateClient.tsx  # county map + SEO content (median income, thresholds, county directory); picking a county starts the result flow
    [state]/[county]/page.tsx             # SEO landing page per county (ISR, revalidate=86400) — CTAs into /us/result.
                                           # Old single-page result links (?d=...) redirect there via middleware.ts instead.
    about/ · privacy/ · contact/          # static info pages
    result/
      page.tsx / DashboardResultClient.tsx  # unified result dashboard (?st=&co=&d= carry state), see below
      overall/ state/ demographic/          # redirect stubs -> /result, kept so old shared links don't 404
data/us/
  stateIncome.json / countyIncome.json / nationalIncome.json
  netWorthPercentilesUS.json / 401kByAge.json / stateMeta.ts
  incomeByAge.json / netWorthByAge.json
lib/
  usIncomeCalc.ts / usInput.ts / usFormat.ts / usGeo.ts / percentileTable.ts
  i18n.ts                                # ko/en copy
  serverLocale.ts / seo.ts / useLocaleBase.ts  # /us vs /kr locale plumbing
  legacyResultRedirect.ts                # shared redirect for the retired /result/overall|state|demographic routes
components/us/
  UsMap.tsx / UsGeoList.tsx / UsInputPanel.tsx / UsResultCard.tsx / UsShell.tsx / Footer.tsx
  result/                                 # shared pieces for the result dashboard
```

### Result flow

Picking a county navigates to `/us/result?st=<state>&co=<county>&d=<answers>` — one scrolling
dashboard with every percentile (national/state/county/age/net worth/401k) computed up front,
plus the share card and "compare with a friend" link near the top. It's a real page (own URL,
works with browser back) that re-derives everything from the query string on each render, same
as before. `/kr/result` serves the same page in Korean via the middleware rewrite. The old
three-step routes (`/result/overall`, `/result/state`, `/result/demographic`) still exist as
redirect stubs so old shared links keep working, but they're disallowed in robots.txt and
non-canonical — new links should point at `/result` directly.

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

## AdSense

- `NEXT_PUBLIC_ADSENSE_CLIENT_ID` env var — the AdSense publisher ID ads actually load with
  (see `lib/ads.ts`; ads only render on the exact host `NEXT_PUBLIC_SITE_URL` points at).
- `public/ads.txt` — has a placeholder publisher ID (`pub-0000000000000000`). Replace it with
  your real AdSense publisher ID (same value as `NEXT_PUBLIC_ADSENSE_CLIENT_ID` above) before
  going live — AdSense won't serve ads on the domain without a matching `ads.txt` entry.
