"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const tabs = [
    { href: "/",     icon: "🏠", label: t.home },
    { href: "/quiz", icon: "🎯", label: t.start },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E5E0]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-16 max-w-[600px] mx-auto">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
            >
              {isActive && (
                <div className="absolute top-0 inset-x-0 flex justify-center">
                  <div className="w-8 h-0.5 rounded-b-full" style={{ background: "#00C805" }} />
                </div>
              )}
              <span
                className="text-xl transition-transform duration-200"
                style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
              >
                {tab.icon}
              </span>
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: isActive ? "#00C805" : "#9CA3AF" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
