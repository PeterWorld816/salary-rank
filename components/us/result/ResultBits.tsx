// Small presentational pieces shared across the three /us/result/* steps —
// moved out of the old single-page UsCountyClient.tsx when the result flow
// was split into pages.
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
