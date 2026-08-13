// Tiny presentational pieces shared by the save-image cards
// (UsShareCardWide.tsx, UsShareCardStory.tsx) — inline styles only, no
// Tailwind, since html-to-image rasterizes these straight from computed
// styles (same convention as the rest of both cards).
import type { Tier } from "@/lib/tier";

const ACCENT = "#34D399";
const HERO_ACCENT = "#FBBF24";

// process.env.NEXT_PUBLIC_SITE_URL is inlined at build time (Next replaces
// this exact expression), so reading it here — even in a client bundle — is
// safe and needs no extra plumbing through props.
export function siteHost(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return "";
  return raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export function ShareTierBadge({ tier, big }: { tier: Tier; big?: boolean }) {
  const color = tier.color === "gold" ? HERO_ACCENT : ACCENT;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        borderRadius: "999px",
        border: `1px solid ${color}66`,
        background: `${color}26`,
        color,
        fontSize: big ? "13px" : "11px",
        fontWeight: 800,
        padding: big ? "4px 12px" : "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {tier.emoji} {tier.label}
    </span>
  );
}

export function ShareMiniRow({ label, sub, value }: { label: string; sub?: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ display: "flex", fontSize: "11px", color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ display: "flex", fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>{sub}</span>}
      </div>
      <span style={{ display: "flex", fontSize: "12px", fontWeight: 800, color: ACCENT }}>{value}</span>
    </div>
  );
}
