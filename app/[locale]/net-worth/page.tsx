import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildNetWorthHub } from "@/lib/seo-pages/netWorth";
import { seoPageMetadata } from "@/lib/seo-pages/metadata";
import SeoArticle from "@/components/seo/SeoArticle";

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return params.locale === "us" ? [{}] : [];
}

export function generateMetadata(): Metadata {
  return seoPageMetadata(buildNetWorthHub());
}

export default function NetWorthHubPage({ params }: { params: { locale: string } }) {
  if (params.locale !== "us") permanentRedirect("/us/net-worth");
  return <SeoArticle page={buildNetWorthHub()} />;
}
