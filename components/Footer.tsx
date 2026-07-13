"use client";
import { useLanguage } from "@/lib/LanguageProvider";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="px-6 pb-8 text-center">
      <p className="text-caption text-text-tertiary">
        {t.appTitle} — {t.tagline}
      </p>
      <p className="text-caption text-text-tertiary mt-1">{t.disclaimer}</p>
      <p className="text-caption text-text-tertiary mt-1">{t.privacyNotice}</p>
    </footer>
  );
}
