// Small presentational pieces shared by the /us/result/* dashboard — moved
// out of the old single-page UsCountyClient.tsx when the result flow was
// first split into steps, then consolidated again into one dashboard.
"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";

export function HeroStat({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="flex-1 text-center">
      <p className="mb-1 text-[11px] leading-tight text-white/55">{label}</p>
      {/* Gold, not mint — keeps the "this is you" number visually distinct
          from the green map/choropleth. */}
      <p className="font-extrabold text-[#FBBF24]" style={{ fontSize: "34px", lineHeight: 1 }}>
        {percent}%
      </p>
    </div>
  );
}

export function NoDataCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center">
      <p className="mb-1 text-[14px] font-semibold text-white/70">{title}</p>
      <p className="text-[12px] text-white/40">{desc}</p>
    </div>
  );
}

export function StatRow({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <div className="text-[14px] font-medium text-white/85">{label}</div>
        {sub && <div className="text-[12px] text-white/40">{sub}</div>}
      </div>
      <div className="text-[16px] font-bold tabular-nums text-[#34D399]">{value}</div>
    </div>
  );
}

export function MissingLocationFallback() {
  const { t } = useLanguage();
  const base = useLocaleBase();
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <p className="mb-2 text-[15px] font-semibold text-white/80">{t.usResultMissingLocationTitle}</p>
      <p className="mb-6 text-[13px] text-white/45">{t.usResultMissingLocationDesc}</p>
      <Link
        href={base}
        className="inline-block rounded-md border border-white/15 px-5 py-2.5 text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
      >
        {t.usResultMissingLocationCta}
      </Link>
    </div>
  );
}
