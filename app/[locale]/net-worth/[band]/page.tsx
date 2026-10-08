import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { NET_WORTH_BRACKETS, buildNetWorthPage, netWorthBracket } from "@/lib/seo-pages/netWorth";
import { seoPageMetadata } from "@/lib/seo-pages/metadata";
import SeoArticle from "@/components/seo/SeoArticle";

type Params = { locale: string; band: string };

export function generateStaticParams({ params }: { params: { locale: string } }) {
  return params.locale === "us" ? NET_WORTH_BRACKETS.map((b) => ({ band: b.id })) : [];
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const b = netWorthBracket(params.band);
  return b ? seoPageMetadata(buildNetWorthPage(b)) : {};
}

export default function NetWorthBandPage({ params }: { params: Params }) {
  const b = netWorthBracket(params.band);
  if (!b) notFound();
  if (params.locale !== "us") permanentRedirect(`/us/net-worth/${b.id}`);
  return <SeoArticle page={buildNetWorthPage(b)} />;
}
