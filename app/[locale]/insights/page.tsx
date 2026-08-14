import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { translations } from "@/lib/i18n";
import { localeFromParams, localeBase, getLangForLocale } from "@/lib/serverLocale";
import { pageMetadata } from "@/lib/seo";
import { getAllInsights } from "@/lib/insights";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import AdSlot from "@/components/ads/AdSlot";

type Params = { locale: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale = localeFromParams(params);
  const t = translations[getLangForLocale(locale)];
  return pageMetadata(locale, `${localeBase(locale)}/insights`, t.usInsightsTitle, t.usInsightsIntro);
}

export default function InsightsListPage({ params }: { params: Params }) {
  const locale = localeFromParams(params);
  const lang = getLangForLocale(locale);
  const t = translations[lang];
  const base = localeBase(locale);
  const articles = getAllInsights(lang);
  const dateFormatter = new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <UsShell>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          href={base}
          className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.home}
        </Link>

        <h1 className="mb-2 text-[26px] font-extrabold tracking-tight text-balance">{t.usInsightsTitle}</h1>
        <p className="mb-8 text-[14px] text-white/55">{t.usInsightsIntro}</p>

        {articles.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-10 text-center text-[13px] text-white/45">
            {t.usInsightsEmpty}
          </div>
        ) : (
          <ul className="space-y-4">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`${base}/insights/${a.slug}`}
                  className="block rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#34D399]/40"
                >
                  <p className="mb-1 text-[11px] font-semibold text-white/35">{dateFormatter.format(new Date(a.date))}</p>
                  <h2 className="mb-1.5 text-[16px] font-bold text-white/90">{a.title}</h2>
                  <p className="text-[13px] leading-relaxed text-white/55">{a.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INSIGHTS_BOTTOM!} className="mt-10" />

        <Footer />
      </div>
    </UsShell>
  );
}
