import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { translations } from "@/lib/i18n";
import { localeFromParams, localeBase, getLangForLocale } from "@/lib/serverLocale";
import { pageMetadata } from "@/lib/seo";
import { getInsightBySlug } from "@/lib/insights";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import AdSlot from "@/components/ads/AdSlot";

const PROSE_CLASSES =
  "text-[14px] text-white/70 " +
  "[&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:text-white/90 " +
  "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-white/85 " +
  "[&_p]:mb-4 [&_p]:leading-relaxed " +
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 " +
  "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 " +
  "[&_a]:text-[#34D399] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-white " +
  "[&_strong]:text-white/90 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-white/55 " +
  "[&_code]:rounded [&_code]:bg-white/[0.08] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] " +
  "[&_hr]:my-8 [&_hr]:border-white/10";

// Splits the article's rendered HTML at the <h2> nearest its midpoint so an
// ad can sit between two sections instead of interrupting a paragraph. Needs
// at least 2 <h2>s to have a sane midpoint — shorter articles just skip the
// mid-article slot rather than splitting somewhere arbitrary.
function splitAtMidHeading(html: string): [string, string] | null {
  const headingStarts = [...html.matchAll(/<h2[\s>]/g)].map((m) => m.index!);
  if (headingStarts.length < 2) return null;
  const mid = headingStarts[Math.floor(headingStarts.length / 2)];
  return [html.slice(0, mid), html.slice(mid)];
}

type Params = { locale: string; slug: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale = localeFromParams(params);
  const article = getInsightBySlug(getLangForLocale(locale), params.slug);
  if (!article) return {};
  return pageMetadata(locale, `${localeBase(locale)}/insights/${params.slug}`, article.title, article.description, {
    image: article.ogImage,
    type: "article",
    publishedTime: article.date,
  });
}

export default function InsightArticlePage({ params }: { params: Params }) {
  const locale = localeFromParams(params);
  const lang = getLangForLocale(locale);
  const t = translations[lang];
  const base = localeBase(locale);
  const article = getInsightBySlug(lang, params.slug);
  if (!article) notFound();

  const dateFormatter = new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <UsShell>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          href={`${base}/insights`}
          className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.usInsightsBackToList}
        </Link>

        <p className="mb-2 text-[11px] font-semibold text-white/35">{dateFormatter.format(new Date(article.date))}</p>
        <h1 className="mb-8 text-[26px] font-extrabold tracking-tight text-balance">{article.title}</h1>

        {(() => {
          const split = splitAtMidHeading(article.html);
          if (!split) return <div className={PROSE_CLASSES} dangerouslySetInnerHTML={{ __html: article.html }} />;
          const [before, after] = split;
          return (
            <>
              <div className={PROSE_CLASSES} dangerouslySetInnerHTML={{ __html: before }} />
              <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INSIGHTS_MID!} className="my-8" />
              <div className={PROSE_CLASSES} dangerouslySetInnerHTML={{ __html: after }} />
            </>
          );
        })()}

        {/* ── CTA: send readers into the calculator ── */}
        <div className="mt-10 rounded-2xl border border-[#34D399]/25 bg-[#34D399]/[0.06] p-6 text-center">
          <p className="mb-1 text-[16px] font-bold text-white">{t.usInsightsCtaTitle}</p>
          <p className="mb-5 text-[13px] text-white/55">{t.usInsightsCtaBody}</p>
          <Link
            href={base}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#34D399] px-6 py-3 text-[14px] font-bold text-[#04120C] transition-all hover:brightness-110 active:scale-[0.99]"
          >
            {t.usInsightsCtaButton}
          </Link>
        </div>

        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INSIGHTS_BOTTOM!} className="mt-10" />

        <Footer />
      </div>
    </UsShell>
  );
}
