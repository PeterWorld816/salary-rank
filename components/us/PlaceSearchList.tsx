"use client";
// Thin client wrapper around UsGeoList for the county page's "cities in this
// county" picker. The county page is a Server Component (ISR-cached, see its
// file header) so it can't hand UsGeoList a live onSelect closure directly —
// this is the one bit of interactivity that needs its own "use client"
// boundary, mirroring how UsStateClient owns the county-picker's onSelect.
import { useRouter } from "next/navigation";
import UsGeoList, { type UsGeoListItem } from "@/components/us/UsGeoList";

export default function PlaceSearchList({
  items,
  resultHrefBase,
  searchPlaceholder,
  emptyText,
}: {
  items: UsGeoListItem[];
  // Full dashboard URL up through "?st=...&co=..." — e.g.
  // "/us/result?st=CA&co=06037". The county page never reads searchParams
  // (see its file header — that's what keeps it ISR-cacheable), so there's
  // no existing query string to merge in here; the picker just appends
  // "&pl=<id>" to this fixed base.
  resultHrefBase: string;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const router = useRouter();

  function handleSelect(placeFips: string) {
    router.push(`${resultHrefBase}&pl=${placeFips}`);
  }

  return <UsGeoList items={items} onSelect={handleSelect} searchPlaceholder={searchPlaceholder} emptyText={emptyText} />;
}
