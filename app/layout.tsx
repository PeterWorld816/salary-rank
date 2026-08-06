import type { Metadata, Viewport } from "next";
import "./globals.css";
import { translations } from "@/lib/i18n";
import { getAppLocale, getLangForLocale } from "@/lib/serverLocale";
import RootBody from "@/components/RootBody";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// Default/fallback metadata only — every real route (/us, /kr and their
// nested pages) sets its own locale-aware metadata via generateMetadata.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: translations.en.usAppTitle,
  description: translations.en.usTagline,
  openGraph: {
    title: translations.en.usAppTitle,
    description: translations.en.usTagline,
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getAppLocale();
  const lang = getLangForLocale(locale);

  return (
    <html lang={lang}>
      <RootBody initialLang={lang}>{children}</RootBody>
    </html>
  );
}
