"use client";
import { usePathname } from "next/navigation";
import { LanguageProvider } from "@/lib/LanguageProvider";
import type { LangCode } from "@/lib/i18n";
import BottomNav from "@/components/BottomNav";
import LanguageSelector from "@/components/LanguageSelector";

export default function RootBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // /us and /kr (the same app under two locale prefixes, see app/[locale])
  // reserve no space for the (hidden-there) bottom nav, and render their own
  // fully dark background — the light-theme body padding would otherwise
  // leave a strip of white showing below it.
  const isUsApp = pathname.startsWith("/us") || pathname.startsWith("/kr");
  // Derived here rather than passed down from app/layout.tsx: the root layout
  // must not read headers() (it would make every route dynamic), and this
  // component already knows the path. Runs during prerender too, so the
  // static /kr/** HTML ships with Korean copy from the first paint.
  const initialLang: LangCode = pathname.startsWith("/kr") ? "ko" : "en";

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
