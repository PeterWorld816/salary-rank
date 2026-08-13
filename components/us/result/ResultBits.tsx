// Small presentational pieces shared by the /us/result/* dashboard — moved
// out of the old single-page UsCountyClient.tsx when the result flow was
// first split into steps, then consolidated again into one dashboard.

// Small ring gauge for the mini stat grid — plain SVG, no charting library
// (see CompareBarChart's header comment for why this app avoids recharts).
// `fillPercent` is 0-100 and always means "how full the ring is", independent
// of what the number displayed in the middle means — callers translate their
// own metric (a "top X%" percentile vs. a 401k ratio-to-average) into that
// 0-100 fill themselves.
function MiniDonut({ fillPercent, color }: { fillPercent: number; color: string }) {
  const size = 46;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(fillPercent, 0), 100);
  const offset = c * (1 - clamped / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

export function MiniStatCard({
  label,
  displayValue,
  fillPercent,
  sub,
  highlight,
}: {
  label: string;
  displayValue: string;
  fillPercent: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors ${
        highlight ? "border-[#FBBF24]/30 bg-[#FBBF24]/[0.06]" : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="relative flex shrink-0 items-center justify-center">
        <MiniDonut fillPercent={fillPercent} color={highlight ? "#FBBF24" : "#34D399"} />
        <span className="absolute text-[10px] font-extrabold tabular-nums text-white">{displayValue}</span>
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[10.5px] leading-tight text-white/55">{label}</p>
        {sub && <p className="truncate text-[9.5px] text-white/35">{sub}</p>}
      </div>
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
