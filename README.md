# Question → Result Skeleton

A reusable Next.js skeleton for the "answer a few questions → get matched to a result → share it"
pattern: question flow → local result matching → shareable result card → OG share image.

No app content is included yet — everything user-facing is a placeholder.

---

## How matching works

Matching is 100% local and driven by two data files — no AI call, no backend:

- `data/questions.ts` — the questions and their options. Each option carries `tags`.
- `data/results.ts` — the possible outcomes. Each result carries `tags` and a `matchResult()`
  function that tallies the tags of every answer and returns the result with the most overlap.

**To build a new app on this skeleton, edit only these two files.** No other code needs to change.

---

## Flow

```
/          → landing page, "Start" button
/quiz      → steps through data/questions.ts, collects answers
/result?id=<result id> → renders the matched ResultDef, share + save-image actions
/api/og    → generates the Open Graph image for a given result id
```

## Structure

```
app/
  page.tsx              # landing
  quiz/page.tsx          # question flow
  result/
    page.tsx             # generateMetadata (OG tags) + renders ResultClient
    ResultClient.tsx      # result card, share/save actions
  api/og/route.tsx        # edge OG image generation
data/
  questions.ts            # question content (edit this)
  results.ts               # result content + matching logic (edit this)
components/
  QuestionCard.tsx         # renders one question
  ResultCard.tsx           # renders one result (also the html-to-image capture target)
  ShareButtons.tsx          # share / save-image actions
lib/
  i18n.ts                   # ko/en language provider, minimal placeholder copy
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

Set `NEXT_PUBLIC_SITE_URL` in the project's environment variables so OG image URLs resolve
correctly in production (see `.env.local.example`).
