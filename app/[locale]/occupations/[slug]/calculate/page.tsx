import type { Metadata } from "next";
import { notFound } from "next/navigation";
import occupationDetails from "@/data/us/occupationDetails.json";
import { occupationPageBySlug } from "@/lib/seo-pages/occupations";
import CalculatorHandoff from "@/components/seo/CalculatorHandoff";

// Hands off to the calculator with this occupation pre-selected. Only the
// occupation's slug travels in the path — never an income or other answer.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function OccupationCalculatePage({ params }: { params: { locale: string; slug: string } }) {
  const entry = occupationPageBySlug(params.slug);
  if (!entry) notFound();
  const majorId = occupationDetails.details.find((d) => d.id === entry.id)?.majorId ?? null;
  return <CalculatorHandoff target={params.locale === "kr" ? "/kr" : "/us"} occupation={majorId} occupationDetail={entry.id} />;
}
