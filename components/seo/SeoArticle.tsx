// Renders a data-driven SEO page (lib/seo-pages/*) — the same object the
// quality gate checks. Server Component: no client JS beyond the shared
// Footer and the in-article ad unit (ArticleAdSlot, the same component and
// rules the insight articles use — mid-article and end, never a new loader).
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import ArticleAdSlot from "@/components/ads/ArticleAdSlot";
import { absoluteUrl } from "@/lib/site-url";
import type { SeoPage, SeoSection } from "@/lib/seo-pages/model";

export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-[12px] text-white/45">
        {items.map((c, i) => (
          <li key={c.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-white/25" aria-hidden />}
            {i < items.length - 1 ? (
              <Link href={c.path} className="hover:text-white">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-white/70">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SectionBody({ section }: { section: SeoSection }) {
  const max = section.bars ? Math.max(...section.bars.map((b) => b.value)) : 0;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-[18px] font-bold text-white/90">{section.heading}</h2>
      {section.paragraphs.map((p, i) => (
        <p key={i} className="mb-4 text-[14px] leading-relaxed text-white/72">
          {p}
        </p>
      ))}
      {section.table && (
        <div className="mb-2 overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[320px] border-collapse text-left text-[13px]">
            {section.table.caption && <caption className="px-3 pb-1 pt-3 text-left text-[11.5px] font-semibold text-white/45">{section.table.caption}</caption>}
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                {section.table.head.map((h, i) => (
                  <th key={i} scope="col" className={`px-3 py-2 font-semibold ${i > 0 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((r, i) => (
                <tr key={i} className="border-b border-white/[0.05] last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className={`px-3 py-2 ${j > 0 ? "text-right tabular-nums text-white/85" : "text-white/75"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section.bars && section.bars.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5" role="img" aria-label={`${section.heading}: ${section.bars.map((b) => `${b.label} ${b.display}`).join(", ")}`}>
          {section.bars.map((b) => (
            <div key={b.label} className="flex items-center gap-2 text-[12px]">
              <span className={`w-24 shrink-0 ${b.highlight ? "font-bold text-[#34D399]" : "text-white/55"}`}>{b.label}</span>
              <div className="h-3 flex-1 rounded bg-white/[0.05]">
                <div className={`h-3 rounded ${b.highlight ? "bg-[#34D399]" : "bg-[#34D399]/45"}`} style={{ width: `${Math.max(3, (b.value / max) * 100)}%` }} />
              </div>
              <span className="w-24 shrink-0 text-right tabular-nums text-white/75">{b.display}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SeoArticle({ page, extra }: { page: SeoPage; extra?: React.ReactNode }) {
  const before = page.sections.slice(0, page.midAdAfter);
  const after = page.sections.slice(page.midAdAfter);
  return (
    <UsShell>
      <BreadcrumbJsonLd items={page.breadcrumbs} />
      <article className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <Breadcrumbs items={page.breadcrumbs} />
        <h1 className="mb-3 text-[26px] font-extrabold tracking-tight text-balance">{page.h1}</h1>
        <p className="mb-8 text-[15px] leading-relaxed text-white/65">{page.lede}</p>

        {before.map((s) => (
          <SectionBody key={s.heading} section={s} />
        ))}
        <ArticleAdSlot className="my-8" />
        {after.map((s) => (
          <SectionBody key={s.heading} section={s} />
        ))}

        {extra}

        {page.cta && (
          <div className="my-10 rounded-2xl border border-[#34D399]/25 bg-[#34D399]/[0.06] p-6 text-center">
            <p className="mb-1 text-[16px] font-bold text-white">{page.cta.label}</p>
            <p className="mb-5 text-[13px] text-white/55">{page.cta.body}</p>
            <Link
              href={page.cta.href}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#34D399] px-6 py-3 text-[14px] font-bold text-[#04120C] transition-all hover:brightness-110"
            >
              Open the calculator
            </Link>
          </div>
        )}

        {page.related.length > 0 && (
          <nav aria-label="Related pages" className="mb-8">
            <h2 className="mb-3 text-[15px] font-bold text-white/85">Related</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {page.related.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white/75 transition-colors hover:border-[#34D399]/40 hover:text-white"
                  >
                    <span>{l.label}</span>
                    {l.note && <span className="shrink-0 text-[11.5px] text-white/40">{l.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <ArticleAdSlot className="my-10" />

        <div className="rounded-lg bg-white/[0.03] px-4 py-3">
          {page.sources.map((s) => (
            <p key={s} className="text-[11.5px] leading-relaxed text-white/40">
              Source: {s}
            </p>
          ))}
          <p className="mt-2 text-[11.5px] text-white/35">Reference statistics only — not financial advice.</p>
        </div>

        <Footer />
      </article>
    </UsShell>
  );
}
