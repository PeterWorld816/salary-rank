import type { Metadata, Viewport } from "next";
import "./globals.css";
import { translations } from "@/lib/i18n";
import RootBody from "@/components/RootBody";

export const metadata: Metadata = {
  title: translations.ko.appTitle,
  description: translations.ko.tagline,
  openGraph: {
    title: translations.ko.appTitle,
    description: translations.ko.tagline,
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
      <RootBody>{children}</RootBody>
    </html>
  );
}
