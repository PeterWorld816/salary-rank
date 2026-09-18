// Shared presentational pieces for ResultCardVisual.tsx — the one card
// design used both on-screen (result headline, compact result card) and for
// Save Image/Save Story (rasterized by html-to-image). Inline styles only,
// no Tailwind, since html-to-image rasterizes straight from computed styles.
//
// Every size below is expressed as `calc(var(--u) * N)`, where `--u` is a
// container-query-driven "1 design pixel" unit set once on ResultCardVisual's
// root (see cardUnit()) — so a prop like `numberSize={40}` still means
// "40px at the card's original design width", but now actually scales with
// however wide the card is rendered (responsive on screen, fixed off-screen
// for capture), instead of being a literal, non-scaling pixel value.
import { formatTemplate } from "@/lib/i18n";
import type { Tier } from "@/lib/tier";
import { DOT_COUNT, filledDotsFromPercent } from "@/lib/decileDots";

export const ACCENT = "#34D399";
export const HERO_ACCENT = "#FBBF24";

const GOLD_GLOW = "radial-gradient(circle, rgba(251,191,36,0.30) 0%, rgba(251,191,36,0.07) 45%, transparent 72%)";
const MINT_GLOW = "radial-gradient(circle, rgba(52,211,153,0.20) 0%, rgba(52,211,153,0.05) 45%, transparent 72%)";

// process.env.NEXT_PUBLIC_SITE_URL is inlined at build time (Next replaces
// this exact expression), so reading it here — even in a client bundle — is
// safe and needs no extra plumbing through props.
export function siteHost(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return "";
  return raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

// Turns a design-pixel number into a CSS length that scales with the card's
// own rendered width via the `--u` custom property (see cardUnit below).
export function cu(px: number): string {
  return `calc(var(--u) * ${px})`;
}

// The `--u` value itself — "1 design pixel" expressed in container-query
// width units, clamped so it can't shrink/grow to a degenerate size in an
// unexpectedly extreme container. At `designWidth` px of actual container
// width, `--u` resolves to exactly 1px, so passing the card's own original
// design-pixel values (40, 13, 6, ...) as props reproduces the original
// layout pixel-for-pixel there, and scales proportionally elsewhere.
export function cardUnit(designWidth: number): string {
  const pct = (100 / designWidth).toFixed(4);
  return `clamp(0.6px, ${pct}cqw, 1.35px)`;
}

// Card-wide background mood, keyed off the same gold/mint split as the tier
// badge — mint reads as a deep green-teal, gold as a deep brown-amber, so
// the whole card's mood changes by tier instead of just a small accent.
export function tierCardBackground(tier: Tier | null, angle = 160): string {
  return tier?.color === "gold"
    ? `linear-gradient(${angle}deg, #2E1B08 0%, #3B240B 55%, #1C1104 100%)`
    : `linear-gradient(${angle}deg, #0B2A22 0%, #0F3A2E 55%, #071D17 100%)`;
}

export function tierBorderColor(tier: Tier | null): string {
  return tier?.color === "gold" ? "rgba(251,191,36,0.35)" : "rgba(52,211,153,0.25)";
}

export function tierGlow(tier: Tier | null): string {
  return tier?.color === "gold" ? GOLD_GLOW : MINT_GLOW;
}

export function tierAccent(tier: Tier | null): string {
  return tier?.color === "gold" ? HERO_ACCENT : ACCENT;
}

export function ShareTierBadge({ tier, big, pulse }: { tier: Tier; big?: boolean; pulse?: boolean }) {
  const color = tierAccent(tier);
  return (
    <span
      className={pulse ? "tier-badge-pulse" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: cu(4),
        borderRadius: "999px",
        border: `1px solid ${color}66`,
        background: `${color}26`,
        color,
        fontSize: cu(big ? 13 : 11),
        fontWeight: 800,
        padding: big ? `${cu(4)} ${cu(12)}` : `${cu(3)} ${cu(10)}`,
        whiteSpace: "nowrap",
      }}
    >
      {tier.emoji} {tier.label}
    </span>
  );
}

// Small (<=12px) top-of-card watermark — the only "branding" element left on
// the card; there is no separate big logo/title anymore.
export function ShareWatermark({ host, fallback }: { host: string; fallback: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: cu(4) }}>
      <span style={{ display: "flex", width: cu(5), height: cu(5), borderRadius: "999px", background: ACCENT, flexShrink: 0 }} />
      <span style={{ display: "flex", color: "rgba(255,255,255,0.55)", fontSize: cu(11), fontWeight: 700, letterSpacing: "0.02em" }}>
        {host || fallback}
      </span>
    </div>
  );
}

// Splits a formatted "Top 35%" / "상위 35%" string into its label word
// ("Top" / "상위") and its number+suffix ("35%") — both of this app's
// templates (see lib/i18n.ts's topPercentTemplate) are "<label> {percent}%",
// so a plain split on the first space works for either locale without
// needing to parse the template itself.
function splitPercentLabel(template: string, percent: number): { label: string; value: string } {
  const full = formatTemplate(template, { percent });
  const [label, ...rest] = full.split(" ");
  return { label, value: rest.join(" ") || full };
}

// The card's dominant element — the percent, split across two lines so the
// number itself can be sized far larger than a plain badge (numberSize is a
// design-pixel value, chosen per-card to clear "at least 1/4 of the card's
// width").
export function ShareHeroPercent({
  percent,
  template,
  numberSize,
  labelSize,
  color,
  glow,
  align = "flex-start",
}: {
  percent: number;
  template: string;
  numberSize: number;
  labelSize?: number;
  color: string;
  glow: string;
  align?: "flex-start" | "center";
}) {
  const { label, value } = splitPercentLabel(template, percent);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align }}>
      <span
        style={{
          display: "flex",
          color: "rgba(255,255,255,0.65)",
          fontSize: cu(labelSize ?? numberSize * 0.22),
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: cu(2),
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: "flex",
          color,
          fontSize: cu(numberSize),
          fontWeight: 900,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          textShadow: glow,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// "10 people, N of them behind you" — filledDotsFromPercent (lib/decileDots.ts)
// is the one place that turns a topPercent into a fill count; this just
// renders that count as a dot row.
export function ShareDecileDots({
  percent,
  dotSize = 14,
  gap = 7,
  wrapAt,
  color,
}: {
  percent: number;
  dotSize?: number;
  gap?: number;
  // Wraps onto a second row after this many dots (e.g. 5, for a 5x2 grid)
  // instead of one long row — useful in the landscape cards' narrower side
  // column.
  wrapAt?: number;
  color: string;
}) {
  const filled = filledDotsFromPercent(percent);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: wrapAt ? "wrap" : "nowrap",
        width: wrapAt ? `calc(${wrapAt} * ${cu(dotSize)} + ${wrapAt - 1} * ${cu(gap)})` : undefined,
        gap: cu(gap),
      }}
    >
      {Array.from({ length: DOT_COUNT }).map((_, i) => (
        <span
          key={i}
          style={{
            display: "flex",
            width: cu(dotSize),
            height: cu(dotSize),
            borderRadius: "999px",
            background: i < filled ? color : "rgba(255,255,255,0.16)",
            boxShadow: i < filled ? `0 0 ${cu(6)} ${color}80` : "none",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// Bottom-of-card two-column footer: current income on the left, the
// already-computed "$X more and you'd reach top Y%" note
// (lib/percentileGap.ts's buildPercentileGapNote — never recomputed here) on
// the right.
export function SharePercentileGapFooter({
  incomeLabel,
  incomeValue,
  gapLabel,
  gapNote,
  align = "flex-start",
}: {
  incomeLabel: string;
  incomeValue: string;
  gapLabel: string;
  gapNote: string | null;
  align?: "flex-start" | "center";
}) {
  const labelStyle = {
    display: "flex" as const,
    fontSize: cu(10),
    color: "rgba(255,255,255,0.45)",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  };
  return (
    <div style={{ display: "flex", width: "100%", alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: cu(2), alignItems: align, minWidth: 0 }}>
        <span style={labelStyle}>{incomeLabel}</span>
        <span style={{ display: "flex", fontSize: cu(13), color: "#FFFFFF", fontWeight: 800, textAlign: align === "center" ? "center" : "left" }}>
          {incomeValue}
        </span>
      </div>
      {gapNote && (
        <>
          <div style={{ display: "flex", width: "1px", background: "rgba(255,255,255,0.14)", margin: `${cu(1)} ${cu(14)} 0 0` }} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1.5, gap: cu(2), minWidth: 0, alignItems: align }}>
            <span style={labelStyle}>{gapLabel}</span>
            <span
              style={{
                display: "-webkit-box",
                fontSize: cu(11),
                color: ACCENT,
                fontWeight: 700,
                lineHeight: 1.3,
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textAlign: align === "center" ? "center" : "left",
              }}
            >
              {gapNote}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
