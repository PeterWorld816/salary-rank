import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { buildOccupationHub, occupationHubGroups } from "@/lib/seo-pages/occupations";
import { seoPageMetadata } from "@/lib/seo-pages/metadata";
import SeoArticle from "@/components/seo/SeoArticle";

// English-only page family: /us is the indexed locale; /kr redirects here.
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return params.locale === "us" ? [{}] : [];
}

export function generateMetadata(): Metadata {
  return seoPageMetadata(buildOccupationHub());
}

export default function OccupationsHubPage({ params }: { params: { locale: string } }) {
  if (params.locale !== "us") permanentRedirect("/us/occupations");
  const page = buildOccupationHub();
  const groups = occupationHubGroups();
  return (
    <SeoArticle
      page={page}
      extra={
        <div className="mb-8 flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.major}>
              <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-white/45">{g.major}</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white/80 hover:border-[#34D399]/40 hover:text-white">
                      <span>{l.label}</span>
                      <span className="shrink-0 text-[11.5px] text-white/40">{l.note}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      }
    />
  );
}
