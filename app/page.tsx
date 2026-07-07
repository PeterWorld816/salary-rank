"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";
import Footer from "@/components/Footer";

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-bg font-sans flex flex-col">
      <section className="flex-1 flex items-center justify-center px-6 fade-up">
        <div className="w-full max-w-md text-center">
          <h1 className="text-display text-text mb-4 text-balance">{t.appTitle}</h1>

          <p className="text-body text-text-secondary mb-12">{t.tagline}</p>

          <Link href="/quiz" className="btn btn-primary px-10">
            {t.start}
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
