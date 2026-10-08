import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { netWorthBracket } from "@/lib/seo-pages/netWorth";
import CalculatorHandoff from "@/components/seo/CalculatorHandoff";
import type { UsAgeBandId } from "@/lib/usInput";

// Hands off to the calculator with the matching age band selected and the
// net worth field open. Only the bracket id is in the path.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function NetWorthCalculatePage({ params }: { params: { locale: string; band: string } }) {
  const b = netWorthBracket(params.band);
  if (!b) notFound();
  return <CalculatorHandoff target={params.locale === "kr" ? "/kr" : "/us"} ageBand={b.appBand as UsAgeBandId} openNetWorth />;
}
