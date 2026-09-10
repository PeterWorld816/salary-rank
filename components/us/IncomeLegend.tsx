// Small "this color = this income range" key shown under the state/county
// choropleth maps — bands must come from colorScale.ts so they always match
// what the map itself painted.
import { buildIncomeScaleBands, NO_DATA_FILL } from "@/components/us/colorScale";
import { FALLBACK_HATCH_PATTERN_ID } from "@/components/us/UsMap";
import { formatUsd } from "@/lib/usFormat";
import { useLanguage } from "@/lib/LanguageProvider";

export default function IncomeLegend({
  min,
  max,
  // Extra key entry for the hatched fallback overlay (see UsMap.tsx's
  // `getFallback`) — only ever passed while occupation shading is active
  // (see UsHomeClient.tsx), since that's the only lens with a fallback
  // that's visually distinguished on the map rather than just noted in the
  // tooltip.
  fallbackLabel,
}: {
  min: number;
  max: number;
  fallbackLabel?: string | null;
}) {
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
      {fallbackLabel && (
        <div className="flex items-center gap-1.5">
          <svg width={10} height={10} className="shrink-0 rounded-sm border border-white/10">
            <rect width={10} height={10} fill="#34D399" />
            <rect width={10} height={10} fill={`url(#${FALLBACK_HATCH_PATTERN_ID})`} />
          </svg>
          <span className="text-[10px] text-white/45">{fallbackLabel}</span>
        </div>
      )}
    </div>
  );
}
