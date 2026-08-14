// Owns the [locale] segment for the whole /us | /kr tree.
//
// generateStaticParams here is what lets every page below be prerendered:
// Next.js composes these params with each nested segment's own
// generateStaticParams (e.g. [state]'s 51 abbreviations), so /us/ca and
// /kr/ca are both build-time known paths rather than per-request renders.
//
// Because [locale] is a dynamic segment, it matches ANY top-level path
// (/foo, /wp-admin, ...) that isn't a real file route — the old middleware
// rewrite used to only touch /us and /kr and let everything else 404. The
// notFound() below restores that.
import { notFound } from "next/navigation";
import { APP_LOCALES, isAppLocale } from "@/lib/serverLocale";

export function generateStaticParams() {
  return APP_LOCALES.map((locale) => ({ locale }));
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isAppLocale(params.locale)) notFound();
  return <>{children}</>;
}
