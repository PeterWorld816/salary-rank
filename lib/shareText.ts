// Single source for the "share title / description" strings that were
// previously hand-built (and hardcoded to Korean) in three separate places:
// ResultClient (native share sheet), result/page.tsx (OG metadata), and
// app/api/og/route.tsx (OG image). Pure function — safe in edge runtime.

import { translations, pick, type LangCode } from "@/lib/i18n";
import type { BreakdownItem } from "@/data/results";

export function buildResultShareText(lang: LangCode, breakdown: BreakdownItem[]) {
  const t = translations[lang];
  const top = breakdown[0];

  if (!top) {
    return { title: t.appTitle, description: t.tagline };
  }

  const title = t.shareTitle
    .replace("{emoji}", top.result.emoji)
    .replace("{percent}", String(top.percent))
    .replace("{title}", pick(top.result.title, lang));

  const description = breakdown
    .map((b) => `${pick(b.result.title, lang)} ${b.percent}%`)
    .join(" · ");

  return { title, description };
}
