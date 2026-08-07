import type { Metadata, Viewport } from "next";
import "./globals.css";
import { translations } from "@/lib/i18n";
import { getAppLocale, getLangForLocale } from "@/lib/serverLocale";
import { getSiteUrl } from "@/lib/site-url";
import RootBody from "@/components/RootBody";
import AdSenseScript from "@/components/ads/AdSenseScript";

// Default/fallback metadata only — every real route (/us, /kr and their
// nested pages) sets its own locale-aware metadata via generateMetadata,
// building canonical/og:url/og:image/twitter:image explicitly through
// lib/site-url.ts. metadataBase here is just a backstop for any metadata
// field that isn't already absolute.
export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
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
  // EXPERIMENT: hardcoded, no headers() call
  const lang = "en" as const;

  return (
    <html lang={lang}>
      <RootBody initialLang={lang}>{children}</RootBody>
      <AdSenseScript />
    </html>
  );
}
