"use client";
import { usePathname } from "next/navigation";
import { LanguageProvider } from "@/lib/LanguageProvider";
import type { LangCode } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";
import LanguageSelector from "@/components/LanguageSelector";

export default function RootBody({ children, initialLang }: { children: React.ReactNode; initialLang: LangCode }) {
  const pathname = usePathname();
  // /us and /kr (both serving the same app, see middleware.ts) reserve no
  // space for the (hidden-there) bottom nav, and render their own fully dark
  // background — the light-theme body padding would otherwise leave a strip
  // of white showing below it.
  const isUsApp = pathname.startsWith("/us") || pathname.startsWith("/kr");

  return (
    <body style={isUsApp ? undefined : { paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
      <LanguageProvider initialLang={initialLang}>
        <div className="fixed top-4 right-4 z-50">
          <LanguageSelector />
        </div>
        {children}
        <BottomNav />
      </LanguageProvider>
    </body>
  );
}
