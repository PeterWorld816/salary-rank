import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";
import LanguageSelector from "@/components/LanguageSelector";

export const metadata: Metadata = {
  title: "🧠 뇌 구조 테스트",
  description: "질문 8개로 알아보는 내 뇌 속 비율",
  openGraph: {
    title: "🧠 뇌 구조 테스트",
    description: "질문 8개로 알아보는 내 뇌 속 비율",
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
      <body className="bg-[#F5F5F0]" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
        <LanguageProvider>
          <div className="fixed top-3 right-3 z-50 sm:top-4 sm:right-4">
            <LanguageSelector />
          </div>
          {children}
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
