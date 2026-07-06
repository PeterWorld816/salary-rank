"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-[#F5F5F0] font-sans">
      <section className="px-5 pt-20 pb-8 text-center max-w-xl mx-auto">
        <h1
          className="font-display leading-tight mb-3"
          style={{ fontWeight: 800, fontSize: "clamp(28px, 8vw, 48px)" }}
        >
          {t.appTitle}
        </h1>

        <p className="text-sm md:text-base text-[#6B7280] mb-10">{t.tagline}</p>

        <Link
          href="/quiz"
          className="inline-block rounded-xl px-8 py-4 text-sm font-semibold text-white card-hover"
          style={{ background: "#0D0D0D" }}
        >
          {t.start}
        </Link>
      </section>
    </main>
  );
}
