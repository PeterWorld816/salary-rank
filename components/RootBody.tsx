"use client";
import { usePathname } from "next/navigation";
import { LanguageProvider } from "@/lib/LanguageProvider";
import BottomNav from "@/components/BottomNav";
import LanguageSelector from "@/components/LanguageSelector";

export default function RootBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // /us reserves no space for the (hidden-there) bottom nav, and renders its
  // own fully dark background — the light-theme body padding would otherwise
  // leave a strip of white showing below it.
  const isUs = pathname.startsWith("/us");

  return (
    <body style={isUs ? undefined : { paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
      <LanguageProvider>
        <div className="fixed top-4 right-4 z-50">
          <LanguageSelector />
        </div>
        {children}
        <BottomNav />
      </LanguageProvider>
    </body>
  );
}
