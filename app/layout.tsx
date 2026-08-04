import type { Metadata, Viewport } from "next";
import "./globals.css";
import { translations } from "@/lib/i18n";
import RootBody from "@/components/RootBody";
import { Analytics } from "@vercel/analytics/next";

// Default/fallback metadata only — "/" now redirects into "/us" (which sets
// its own metadata), and app/kr/* pages set their own Korean-app metadata.
// This just covers any route that doesn't override it.
export const metadata: Metadata = {
  title: translations.ko.usAppTitle,
  description: translations.ko.usTagline,
  openGraph: {
    title: translations.ko.usAppTitle,
    description: translations.ko.usTagline,
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
  return (
    <html lang="en">
      <RootBody>
        {children}
        <Analytics />
      </RootBody>
    </html>
  );
}
