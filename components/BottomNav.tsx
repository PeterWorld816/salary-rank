"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Target } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // /us is a fully separate dark-themed section with its own in-page
  // navigation (back links, breadcrumbs) — the light bottom bar doesn't fit.
  if (pathname.startsWith("/us")) return null;

  const tabs = [
    { href: "/", Icon: Home, label: t.home },
    { href: "/quiz", Icon: Target, label: t.start },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", borderTop: "1px solid var(--color-border)" }}
    >
      <div className="flex h-16 max-w-[600px] mx-auto">
        {tabs.map(({ href, Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 relative ${
                isActive ? "text-accent" : "text-text-tertiary"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 inset-x-0 flex justify-center">
                  <div className="w-8 h-0.5 rounded-b-full bg-accent" />
                </div>
              )}
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 2} />
              <span className="text-caption font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
