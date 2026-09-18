// The one result-card design — tier-colored background, a giant percent,
// a 10-dot "beat N of 10" visualization, and a CURRENT INCOME / TO NEXT TIER
// footer. Used in three places, always with the exact same props/data for a
// given result so numbers/text can never drift between them:
//   - PersonalizedResult.tsx's on-screen headline (variant="wide", visible,
//     responsive — the card the visitor actually sees).
//   - CompactResultCard.tsx's on-screen headline (variant="wide", same as
//     above, for the home/state/county drill-down steps).
//   - A hidden, fixed-design-width instance of this same component behind
//     each page's "Save Image"/"Save Story" buttons (variant="wide" for Save
//     Image, "story" for Save Story) — rasterized by html-to-image. See
//     WIDE_WIDTH/HEIGHT and STORY_WIDTH/HEIGHT below for the fixed pixel size
//     those hidden instances render at.
//
// Responsive by design rather than by fixed pixels: the root is a CSS
// container-query context (`containerType: inline-size`) with a locked
// aspect-ratio, and every internal size is `calc(var(--u) * N)` (see
// ShareCardBits.tsx's cu()/cardUnit()) where `--u` is "1 design pixel" in
// container-query width units. On screen, the caller wraps this in a
// `max-width` + centered container so it fills whatever width is available
// (mobile included) while staying proportional; off-screen, the caller pins
// the wrapper to an exact pixel width (WIDE_WIDTH/STORY_WIDTH) so `--u`
// resolves to real pixels identical to the original fixed-size design —
// guaranteeing the capture matches what's on screen pixel-for-pixel.
import type { CSSProperties, RefObject } from "react";
import type { Tier } from "@/lib/tier";
import {
  ShareTierBadge,
  ShareWatermark,
  ShareHeroPercent,
  ShareDecileDots,
  SharePercentileGapFooter,
  tierCardBackground,
  tierBorderColor,
  tierGlow,
  tierAccent,
  cardUnit,
  cu,
  ACCENT,
} from "@/components/us/ShareCardBits";
import { formatTemplate } from "@/lib/i18n";
import TierRevealAnimation from "@/components/us/result/TierRevealAnimation";

// Design pixel sizes each variant's `--u` is calibrated against — see
// cardUnit() above. These are also the exact CSS pixel dimensions the hidden
// capture instances are rendered at (before ShareButtons' pixelRatio:3
// upscale), matching the original UsShareCardWide/Compact/Story sizes so
// Save Image/Save Story keep producing the same 1200x630 / 1080x1920 assets.
export const WIDE_WIDTH = 400;
export const WIDE_HEIGHT = 210;
export const STORY_WIDTH = 360;
export const STORY_HEIGHT = 640;

export type ResultCardVisualVariant = "wide" | "story";

export type ResultCardVisualProps = {
  variant: ResultCardVisualVariant;
  cardRef?: RefObject<HTMLDivElement>;
  tier: Tier | null;
  // The stable, final percent — drives tier color, the dot fill count, and
  // the badge. Never the mid-count-up value (see `displayPercent`).
  percent: number | null;
  // Value shown in the big hero number itself — defaults to `percent`.
  // Callers animating a count-up pass the animating value here while keeping
  // `percent` (and therefore the tier/dots/badge) stable at the target.
  displayPercent?: number | null;
  percentTemplate: string;
  // Short sub-label under the hero number (e.g. "County income") — null
  // omits it.
  subLabel?: string | null;
  // Top-left line (e.g. "Asheville, NC") — null omits it (the watermark
  // still renders on the right).
  locationLine?: string | null;
  host: string;
  watermarkFallback: string;
  incomeLabel: string;
  incomeValue: string;
  gapLabel: string;
  gapNote?: string | null;
  beatText: string;
  // Story-variant-only secondary metric pill (e.g. "State income — Top 40%").
  secondaryLabel?: string | null;
  secondaryValueText?: string | null;
  sourceText?: string | null;
  noDataMessage?: string;
  // Tier-branched reveal effect (light sweep / confetti) — see
  // TierRevealAnimation.tsx. Leave false for hidden capture instances.
  play?: boolean;
  // "encourage" tier group's badge pulse — see TierBadge.tsx's original
  // Tailwind version; this is the inline-style equivalent for this card.
  pulse?: boolean;
};

export default function ResultCardVisual({
  variant,
  cardRef,
  tier,
  percent,
  displayPercent,
  percentTemplate,
  subLabel,
  locationLine,
  host,
  watermarkFallback,
  incomeLabel,
  incomeValue,
  gapLabel,
  gapNote,
  beatText,
  secondaryLabel,
  secondaryValueText,
  sourceText,
  noDataMessage,
  play = false,
  pulse = false,
}: ResultCardVisualProps) {
  const isStory = variant === "story";
  const designWidth = isStory ? STORY_WIDTH : WIDE_WIDTH;
  const designHeight = isStory ? STORY_HEIGHT : WIDE_HEIGHT;
  const accent = tierAccent(tier);
  const heroPercent = displayPercent ?? percent;

  const rootStyle: CSSProperties = {
    ["--u" as string]: cardUnit(designWidth),
    containerType: "inline-size",
    width: "100%",
    aspectRatio: `${designWidth} / ${designHeight}`,
    background: tierCardBackground(tier),
    display: "flex",
    flexDirection: "column",
    alignItems: isStory ? "center" : undefined,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: "relative",
    overflow: "hidden",
    borderRadius: cu(isStory ? 0 : 16),
    flexShrink: 0,
    border: isStory ? undefined : `calc(var(--u) * 1.5) solid ${tierBorderColor(tier)}`,
    padding: isStory ? `${cu(22)} 0 0` : `${cu(14)} ${cu(22)} ${cu(16)}`,
    boxSizing: "border-box",
  } as CSSProperties;

  return (
    <div ref={cardRef} style={rootStyle}>
      {tier && <TierRevealAnimation tier={tier} play={play} />}

      <div
        style={{
          position: "absolute",
          width: cu(isStory ? 380 : 280),
          height: cu(isStory ? 380 : 280),
          top: cu(isStory ? -60 : -80),
          left: isStory ? cu(-80) : cu(-60),
          background: tierGlow(tier),
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      {isStory && (
        <div
          style={{
            position: "absolute",
            width: cu(300),
            height: cu(300),
            bottom: cu(100),
            right: cu(-100),
            background: tierGlow(tier),
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
      )}

      {isStory ? (
        <>
          <div style={{ display: "flex", zIndex: 1 }}>
            <ShareWatermark host={host} fallback={watermarkFallback} />
          </div>
          {locationLine != null && (
            <div style={{ display: "flex", color: "rgba(255,255,255,0.45)", fontSize: cu(13), marginTop: cu(14), zIndex: 1 }}>
              {locationLine}
            </div>
          )}
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
          <span style={{ display: "flex", color: "rgba(255,255,255,0.45)", fontSize: cu(11) }}>{locationLine}</span>
          <ShareWatermark host={host} fallback={watermarkFallback} />
        </div>
      )}

      {percent == null || tier == null ? (
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: isStory ? "center" : undefined,
            textAlign: isStory ? "center" : undefined,
            color: "rgba(255,255,255,0.5)",
            fontSize: cu(isStory ? 18 : 14),
            maxWidth: isStory ? cu(280) : cu(220),
            zIndex: 1,
          }}
        >
          {noDataMessage}
        </div>
      ) : isStory ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center", zIndex: 1, gap: cu(14) }}>
          <ShareTierBadge tier={tier} big pulse={pulse} />

          <ShareHeroPercent
            percent={heroPercent!}
            template={percentTemplate}
            numberSize={128}
            labelSize={26}
            color={accent}
            glow={`0 0 ${cu(40)} ${accent}80`}
            align="center"
          />
          {subLabel && <span style={{ display: "flex", color: "rgba(255,255,255,0.55)", fontSize: cu(14) }}>{subLabel}</span>}

          {secondaryLabel && secondaryValueText && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: cu(8),
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                padding: `${cu(7)} ${cu(18)}`,
              }}
            >
              <span style={{ display: "flex", fontSize: cu(12), color: "rgba(255,255,255,0.55)" }}>{secondaryLabel}</span>
              <span style={{ display: "flex", fontSize: cu(16), fontWeight: 800, color: ACCENT }}>{secondaryValueText}</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: cu(8), marginTop: cu(6) }}>
            <ShareDecileDots percent={percent} dotSize={18} gap={10} color={accent} />
            <span style={{ display: "flex", color: "rgba(255,255,255,0.5)", fontSize: cu(13) }}>{beatText}</span>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1, alignItems: "flex-start", gap: cu(18), zIndex: 1, minHeight: 0, paddingTop: cu(4) }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", marginBottom: cu(3) }}>
              <ShareTierBadge tier={tier} pulse={pulse} />
            </div>
            <ShareHeroPercent percent={heroPercent!} template={percentTemplate} numberSize={40} color={accent} glow={`0 0 ${cu(26)} ${accent}66`} />
            {subLabel && <span style={{ display: "flex", color: "rgba(255,255,255,0.5)", fontSize: cu(11), marginTop: cu(2) }}>{subLabel}</span>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: cu(8), flexShrink: 0 }}>
            <ShareDecileDots percent={percent} dotSize={13} gap={6} wrapAt={5} color={accent} />
            <span style={{ display: "flex", color: "rgba(255,255,255,0.45)", fontSize: cu(10), textAlign: "center", maxWidth: cu(90), lineHeight: 1.3 }}>
              {beatText}
            </span>
          </div>
        </div>
      )}

      {percent != null && tier != null && (
        <div
          style={
            isStory
              ? {
                  display: "flex",
                  width: "100%",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  padding: `${cu(16)} ${cu(24)} ${cu(20)}`,
                  flexDirection: "column",
                  alignItems: "center",
                  gap: cu(10),
                  zIndex: 1,
                  boxSizing: "border-box",
                }
              : { display: "flex", zIndex: 1 }
          }
        >
          <SharePercentileGapFooter
            incomeLabel={incomeLabel}
            incomeValue={incomeValue}
            gapLabel={gapLabel}
            gapNote={gapNote ?? null}
            align={isStory ? "center" : "flex-start"}
          />
          {isStory && sourceText && (
            <span style={{ display: "flex", color: "rgba(255,255,255,0.3)", fontSize: cu(11), textAlign: "center" }}>{sourceText}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Convenience re-export so callers formatting a plain "Top N%" string for a
// secondary/pill value don't need their own import of formatTemplate just
// for that.
export function formatPercentText(template: string, percent: number): string {
  return formatTemplate(template, { percent });
}
