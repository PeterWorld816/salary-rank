// Small "this color = this income range" key shown under the state/county
// choropleth maps — bands must come from colorScale.ts so they always match
// what the map itself painted.
import { buildIncomeScaleBands, NO_DATA_FILL } from "@/components/us/colorScale";
import { formatUsd } from "@/lib/usFormat";
import { useLanguage } from "@/lib/LanguageProvider";

export default function IncomeLegend({ min, max }: { min: number; max: number }) {
  const { t } = useLanguage();
  const bands = buildIncomeScaleBands(min, max);
  if (bands.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
      {bands.map((band, i) => {
        const rangeLabel =
          i === 0
            ? `<${formatUsd(band.hiValue)}`
            : i === bands.length - 1
              ? `${formatUsd(band.loValue)}+`
              : `${formatUsd(band.loValue)}–${formatUsd(band.hiValue)}`;
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: band.color }} />
            <span className="text-[10px] text-white/45">{rangeLabel}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-white/10" style={{ background: NO_DATA_FILL }} />
        <span className="text-[10px] text-white/45">{t.usLegendNoData}</span>
      </div>
    </div>
  );
}
