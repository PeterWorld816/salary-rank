// The /us/[state] "deep dive" block (lib/seo-pages/stateDeepDive.ts) —
// server-rendered into the prerendered HTML and handed to UsStateClient as a
// prop, the same way that page already threads its ad slot through. No ads
// here: the state page is a map page.
import Link from "next/link";
import { SectionBody } from "@/components/seo/SeoArticle";
import type { SeoPage } from "@/lib/seo-pages/model";

export default function StateDeepDive({ page, links }: { page: SeoPage; links: { href: string; label: string }[] }) {
  return (
    <section aria-labelledby="state-deep-dive" className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6">
      <h2 id="state-deep-dive" className="mb-2 text-[20px] font-extrabold tracking-tight text-white">
        {page.sections[0]?.heading.replace(/^How (.+) compares$/, "$1 income in depth")}
      </h2>
      <p className="mb-6 text-[14px] leading-relaxed text-white/65">{page.lede}</p>
      {page.sections.map((s) => (
        <SectionBody key={s.heading} section={s} />
      ))}
      <nav aria-label="Related pages" className="mt-2">
        <h3 className="mb-2 text-[13px] font-bold text-white/70">Related</h3>
        <ul className="flex flex-wrap gap-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 text-[12.5px] text-white/70 hover:border-[#34D399]/40 hover:text-white">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-4 text-[11px] text-white/35">Reference statistics only — not financial advice.</p>
    </section>
  );
}
