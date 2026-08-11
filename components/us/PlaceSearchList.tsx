"use client";
// Thin client wrapper around UsGeoList for "cities in this county" pickers.
// Originally built so the county SEO page (a Server Component, ISR-cached —
// see its file header) could hand UsGeoList a live onSelect closure without
// itself needing a "use client" boundary; the dashboard (already a client
// component) reuses the same picker inline via the `onSelect` override below
// instead of the default `resultHrefBase` navigation.
import { useRouter } from "next/navigation";
import UsGeoList, { type UsGeoListItem } from "@/components/us/UsGeoList";

export default function PlaceSearchList({
  items,
  resultHrefBase,
  onSelect,
  searchPlaceholder,
  emptyText,
}: {
  items: UsGeoListItem[];
  // The county's own page path (e.g. "/us/CA/06037") — the picked place's
  // fips is appended as a path segment to reach its own SEO+result page.
  // Ignored when `onSelect` is given.
  resultHrefBase?: string;
  // Overrides the default push-to-resultHrefBase navigation — used by the
  // dashboard's city picker chip to navigate with today's answers carried
  // along instead of this component's plain path-only push.
  onSelect?: (placeFips: string) => void;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const router = useRouter();

  function handleSelect(placeFips: string) {
    if (onSelect) {
      onSelect(placeFips);
      return;
    }
    if (resultHrefBase) router.push(`${resultHrefBase}/${placeFips}`);
  }

  return <UsGeoList items={items} onSelect={handleSelect} searchPlaceholder={searchPlaceholder} emptyText={emptyText} />;
}
