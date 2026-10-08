"use client";
// The single row at the top of every map card: where you are
// ("US Map › Alabama › Jefferson County"), one step back up, and the place
// search (GeoCombobox). It replaces the separate "Select a state" heading,
// back link and always-open list that used to sit around the maps.
//
// Sticky inside its card, offset by the fixed 64px input-panel header
// (UsInputPanel's HEADER_HEIGHT) so the two never overlap. It's also the
// positioned ancestor GeoCombobox's dropdown anchors to.
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";

export type MapNavCrumb = { label: string; href?: string };

export default function MapNavBar({
  crumbs,
  back,
  children,
}: {
  // Root first, current level last. The last crumb is never a link.
  crumbs: MapNavCrumb[];
  back?: { label: string; href: string } | null;
  // The search box.
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const current = crumbs[crumbs.length - 1];

  return (
    <nav
      aria-label={t.usMapNavLabel}
      className="sticky top-16 z-20 -mx-3 -mt-3 mb-3 flex items-center gap-2 rounded-t-2xl border-b border-white/[0.06] bg-[#0d0f11]/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:-mt-4 sm:px-4"
    >
      {back && (
        <Link
          href={back.href}
          aria-label={formatTemplate(t.usMapNavBackTemplate, { place: back.label })}
          className="flex h-9 max-w-[7.5rem] shrink-0 items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.04] pl-1.5 pr-2.5 text-[13px] font-semibold text-white/70 transition-colors hover:border-[#34D399]/40 hover:bg-[#34D399]/10 hover:text-white sm:max-w-none"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{back.label}</span>
        </Link>
      )}

      {/* Phones get the current level only; the back button already names
          the level above it. */}
      <p className="min-w-0 shrink truncate text-[13px] font-bold text-white/90 sm:hidden">{current?.label}</p>
      <ol className="hidden min-w-0 shrink items-center gap-1.5 text-[13px] sm:flex">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${i}-${crumb.label}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span className="text-white/30" aria-hidden>›</span>}
              {crumb.href && !last ? (
                <Link href={crumb.href} className="truncate text-white/55 transition-colors hover:text-white">
                  {crumb.label}
                </Link>
              ) : (
                <span className={`truncate ${last ? "font-bold text-white/90" : "text-white/55"}`} aria-current={last ? "location" : undefined}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="ml-auto flex min-w-[8.5rem] flex-1 justify-end">{children}</div>
    </nav>
  );
}
