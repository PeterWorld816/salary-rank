"use client";
// Manually placed in-article ad for /us/insights/* (and /kr/insights/*) only —
// never the map, home or result screens, where an ad next to the controls
// invites accidental taps.
//
// Separate from AdSlot.tsx on purpose: that one is a Server Component gated on
// NEXT_PUBLIC_ADSENSE_CLIENT_ID + NEXT_PUBLIC_SITE_URL and takes its slot as a
// prop for the other placements. This one only needs its own slot id — the
// publisher id is the same public constant the site-wide Auto ads loader
// (AdSenseScript.tsx) uses, and that loader is what actually fetches
// adsbygoogle.js; nothing here loads a script.
//
// NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE is inlined at build time. Empty or unset
// means no ad unit has been created yet: render nothing at all, not an empty
// reserved box.
import { useEffect, useRef } from "react";

const ADSENSE_CLIENT_ID = "ca-pub-7379794980536826";
const ARTICLE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE ?? "";

// Roughly the height of a responsive in-article unit on a phone, reserved up
// front so the text below doesn't jump when the ad fills in.
const MIN_HEIGHT = 280;

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function ArticleAdSlot({ className }: { className?: string }) {
  const insRef = useRef<HTMLModElement>(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    const ins = insRef.current;
    // One push per <ins>: re-renders, and React StrictMode's dev-only
    // unmount/remount, would otherwise ask AdSense to fill it twice, which
    // it rejects ("All ins elements ... already have ads in them").
    if (!ins || pushedRef.current || ins.getAttribute("data-adsbygoogle-status")) return;
    pushedRef.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // adsbygoogle.js blocked or errored — the reserved space just stays empty.
    }
  }, []);

  if (!ARTICLE_SLOT) return null;

  return (
    <aside className={className} aria-label="Advertisement">
      <p className="mb-1 text-center text-[10px] uppercase tracking-wide text-white/30">Advertisement</p>
      <div style={{ minHeight: MIN_HEIGHT }}>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={ARTICLE_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
