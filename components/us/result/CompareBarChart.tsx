// Lightweight horizontal-bar comparison across every percentile the
// dashboard computed (national/state/county/age income, net worth, age net
// worth) — a quick "which basis makes me look best" visual next to the
// individual stat cards. Percentiles here are all "top X%" (lower = better),
// so bar length is driven by (100 - percent): the better the rank, the
// longer the bar. No charting library — same plain-div approach as the rest
// of /us (see DistributionChart) rather than pulling in recharts for one bar
// chart.
export type CompareBarItem = {
  key: string;
  label: string;
  percent: number;
  valueLabel: string;
};

export function CompareBarChart({ items }: { items: CompareBarItem[] }) {
  if (items.length === 0) return null;
  const best = items.reduce((a, b) => (b.percent < a.percent ? b : a));

  return (
    <div className="flex flex-col gap-3.5">
      {items.map((item) => {
        const isBest = item.key === best.key;
        const rank = Math.max(100 - item.percent, 2);
        return (
          <div key={item.key}>
            <div className="mb-1 flex items-center justify-between gap-3 text-[12px]">
              <span className="truncate text-white/60">{item.label}</span>
              <span className={`shrink-0 font-bold tabular-nums ${isBest ? "text-[#FBBF24]" : "text-white/80"}`}>
                {item.valueLabel}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${rank}%`, background: isBest ? "#FBBF24" : "#34D399" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
