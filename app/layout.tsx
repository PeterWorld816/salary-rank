import type { Metadata, Viewport } from "next";
import "./globals.css";
import { translations } from "@/lib/i18n";
import { LanguageProvider } from "@/lib/LanguageProvider";
import BottomNav from "@/components/BottomNav";
import LanguageSelector from "@/components/LanguageSelector";

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
      <body style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
        <LanguageProvider>
          <div className="fixed top-4 right-4 z-50">
            <LanguageSelector />
          </div>
          {children}
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
