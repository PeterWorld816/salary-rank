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
  // Full dashboard URL up through "?st=...&co=..." — e.g.
  // "/us/result?st=CA&co=06037". The county page never reads searchParams
  // (see its file header — that's what keeps it ISR-cacheable), so there's
  // no existing query string to merge in here; the default handler just
  // appends "&pl=<id>" to this fixed base. Ignored when `onSelect` is given.
  resultHrefBase?: string;
  // Overrides the default push-to-resultHrefBase navigation — used by the
  // dashboard to update the "pl" param in place instead of navigating.
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
    if (resultHrefBase) router.push(`${resultHrefBase}&pl=${placeFips}`);
  }

  return <UsGeoList items={items} onSelect={handleSelect} searchPlaceholder={searchPlaceholder} emptyText={emptyText} />;
}
