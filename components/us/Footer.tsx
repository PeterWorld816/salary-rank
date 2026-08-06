"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";

export default function Footer() {
  const { t } = useLanguage();
  const base = useLocaleBase();

  const links = [
    { href: `${base}/insights`, label: t.footerInsights },
    { href: `${base}/about`, label: t.footerAbout },
    { href: `${base}/privacy`, label: t.footerPrivacy },
    { href: `${base}/contact`, label: t.footerContact },
  ];

  return (
    <footer className="mt-10 border-t border-white/10 pt-6">
      <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-[12px] text-white/40 transition-colors hover:text-white/70"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
