// /us/where-to-live — "Where can your income live best?". The tool
// (WhereToLiveClient, which lazy-fetches public/data/livability.json) comes
// first; the explainer below it is the quality-gated SeoPage built by
// lib/seo-pages/whereToLive.ts, and the only place this page shows ads (the
// same in-article unit and rules as the other data pages — never inside the
// tool). English-only like the other data pages: /kr redirects here.
import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { getUsStatesGeo } from "@/lib/usGeo";
import { seoPageMetadata } from "@/lib/seo-pages/metadata";
import { buildWhereToLivePage, WHERE_TO_LIVE_PATH } from "@/lib/seo-pages/whereToLive";
import { BreadcrumbJsonLd, Breadcrumbs, SectionBody } from "@/components/seo/SeoArticle";
import UsShell from "@/components/us/UsShell";
import Footer from "@/components/us/Footer";
import ArticleAdSlot from "@/components/ads/ArticleAdSlot";
import WhereToLiveClient from "@/components/us/livability/WhereToLiveClient";
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "@/components/us/ShieldShareCard";
import { absoluteUrl } from "@/lib/site-url";

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return params.locale === "us" ? [{}] : [];
}

export function generateMetadata(): Metadata {
  const meta = seoPageMetadata(buildWhereToLivePage());
  // Generic card (no params) — a shared link never carries anyone's result.
  const image = absoluteUrl(`${WHERE_TO_LIVE_PATH}/og`);
  return {
    ...meta,
    openGraph: { ...meta.openGraph, images: [{ url: image, width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT }] },
    twitter: { ...meta.twitter, images: [image] },
  };
}

export default function WhereToLivePage({ params }: { params: { locale: string } }) {
  if (params.locale !== "us") permanentRedirect(WHERE_TO_LIVE_PATH);
  const page = buildWhereToLivePage();
  const before = page.sections.slice(0, page.midAdAfter);
  const after = page.sections.slice(page.midAdAfter);
  return (
    <UsShell>
      <BreadcrumbJsonLd items={page.breadcrumbs} />
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
        <Breadcrumbs items={page.breadcrumbs} />
        <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-balance sm:text-[26px]">{page.h1}</h1>

        <WhereToLiveClient geo={getUsStatesGeo()} />

        <article className="mt-14 border-t border-white/10 pt-8">
          <p className="mb-8 text-[15px] leading-relaxed text-white/65">{page.lede}</p>
          {before.map((s) => (
            <SectionBody key={s.heading} section={s} />
          ))}
          <ArticleAdSlot className="my-8" />
          {after.map((s) => (
            <SectionBody key={s.heading} section={s} />
          ))}
          <ArticleAdSlot className="my-10" />

          <nav aria-label="Related pages" className="mb-8">
            <h2 className="mb-3 text-[15px] font-bold text-white/85">Related</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {page.related.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex min-h-11 items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white/75 transition-colors hover:border-[#34D399]/40 hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="rounded-lg bg-white/[0.03] px-4 py-3">
            {page.sources.map((s) => (
              <p key={s} className="text-[11.5px] leading-relaxed text-white/40">
                Source: {s}
              </p>
            ))}
            <p className="mt-2 text-[11.5px] text-white/35">Estimates from pre-tax income — not financial, tax or relocation advice.</p>
          </div>
        </article>

        <Footer />
      </div>
    </UsShell>
  );
}
