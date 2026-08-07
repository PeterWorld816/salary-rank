// Static "top X% -> $Y" rows, shared by the /us/[state] and
// /us/[state]/[county] SEO content — no hooks, so it renders the same
// whether its caller is a server component (county page) or a client one
// (UsStateClient's map view).
import { formatTemplate } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";

export function PercentileThresholds({
  rows,
  topPercentTemplate,
}: {
  rows: { percent: number; amount: number }[];
  topPercentTemplate: string;
}) {
  return (
    <dl className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02] px-4">
      {rows.map((row) => (
        <div key={row.percent} className="flex items-center justify-between py-2.5">
          <dt className="text-[14px] font-medium text-white/85">{formatTemplate(topPercentTemplate, { percent: row.percent })}</dt>
          <dd className="text-[15px] font-bold tabular-nums text-[#34D399]">{formatUsd(row.amount)}</dd>
        </div>
      ))}
    </dl>
  );
}
