// Small "this color = this income range" key shown under the state/county
// choropleth maps — bands must come from colorScale.ts so they always match
// what the map itself painted. The callers pass whichever min/max is painting
// the map right now (household, marital, men/women, occupation or
// personalized), so the key follows every SHADING change. Its title is the
// MapBasisCaption it sits inside.
import { buildIncomeScaleBands, NO_DATA_FILL } from "@/components/us/colorScale";
import { FALLBACK_HATCH_PATTERN_ID } from "@/components/us/UsMap";
import { formatUsdCompact } from "@/lib/usFormat";
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
    <div className="flex flex-col gap-2">
      {/* A strip of color segments (two rows of three on phones, so every
          range label stays readable), each range printed under its own color. */}
      <ol className="grid grid-cols-3 gap-x-px gap-y-2 sm:grid-cols-6">
        {bands.map((band, i) => {
          const rangeLabel =
            i === 0
              ? `< ${formatUsdCompact(band.hiValue)}`
              : i === bands.length - 1
                ? `${formatUsdCompact(band.loValue)}+`
                : `${formatUsdCompact(band.loValue)}–${formatUsdCompact(band.hiValue)}`;
          return (
            <li key={i} className="flex min-w-0 flex-col gap-1">
              <span className="h-2.5 w-full" style={{ background: band.color }} aria-hidden />
              <span className="truncate text-center text-[11px] tabular-nums text-white/70">{rangeLabel}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 shrink-0 rounded-sm border border-white/15" style={{ background: NO_DATA_FILL }} />
          <span className="text-[11px] text-white/60">{t.usLegendNoData}</span>
        </div>
        {fallbackLabel && (
          <div className="flex items-center gap-1.5">
            <svg width={12} height={12} className="shrink-0 rounded-sm border border-white/15">
              <rect width={12} height={12} fill="#34D399" />
              <rect width={12} height={12} fill={`url(#${FALLBACK_HATCH_PATTERN_ID})`} />
            </svg>
            <span className="text-[11px] text-white/60">{fallbackLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
