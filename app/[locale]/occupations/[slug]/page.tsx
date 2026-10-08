import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { OCCUPATION_PAGES, buildOccupationPage, occupationPageBySlug } from "@/lib/seo-pages/occupations";
import { seoPageMetadata } from "@/lib/seo-pages/metadata";
import SeoArticle from "@/components/seo/SeoArticle";

type Params = { locale: string; slug: string };

// Only the occupations listed in data/seo/occupationPages.json exist.
export const dynamicParams = true;
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return params.locale === "us" ? OCCUPATION_PAGES.map((p) => ({ slug: p.slug })) : [];
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const entry = occupationPageBySlug(params.slug);
  return entry ? seoPageMetadata(buildOccupationPage(entry)) : {};
}

export default function OccupationPage({ params }: { params: Params }) {
  const entry = occupationPageBySlug(params.slug);
  if (!entry) notFound();
  if (params.locale !== "us") permanentRedirect(`/us/occupations/${entry.slug}`);
  return <SeoArticle page={buildOccupationPage(entry)} />;
}
