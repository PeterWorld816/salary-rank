import type { Metadata, Viewport } from "next";
import "./globals.css";
import { translations } from "@/lib/i18n";
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

// Deliberately reads nothing request-scoped (no headers()/cookies()): this
// layout wraps EVERY route, so a single dynamic API call here would force
// per-request rendering site-wide and disable ISR on the county/place pages.
// The locale-dependent bits are handled below the layout instead — RootBody
// derives the language from the pathname, and LanguageProvider corrects
// <html lang> on mount (lib/LanguageProvider.tsx).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <RootBody>{children}</RootBody>
      <AdSenseScript />
    </html>
  );
}
