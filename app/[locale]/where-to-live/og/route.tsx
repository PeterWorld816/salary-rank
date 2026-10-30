// Share image for /us/where-to-live — the LivabilityShareCard rasterized at
// 3× (1080×1350, or 1080×1920 with card=story), same sizes as the shield
// card. Params are the minimum the card shows and nothing more: p (percent
// of metros Comfortable or better), a (best metro slug), g (its grade).
// No income ever travels in this URL.
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import LivabilityShareCard from "@/components/us/livability/LivabilityShareCard";
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH, STORY_IMAGE_HEIGHT, STORY_IMAGE_WIDTH } from "@/components/us/ShieldShareCard";
import { GRADE_LABELS } from "@/lib/livabilityGrades";
import type { GradeId } from "@/lib/livability";

export const runtime = "edge";

const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const rawP = searchParams.get("p");
  const raw = rawP == null ? NaN : Number(rawP);
  const percent = Number.isFinite(raw) && raw >= 0 && raw <= 100 ? Math.round(raw) : null;
  const g = searchParams.get("g");
  const grade = g && g in GRADE_LABELS ? (g as GradeId) : null;
  const slug = searchParams.get("a");
  let bestName: string | null = null;
  if (slug && /^[a-z0-9-]{1,80}$/.test(slug)) {
    // The metro's display name comes from the same public data file the page
    // uses; the slug alone is never echoed back as text.
    try {
      const res = await fetch(`${origin}/data/livability.json`);
      if (res.ok) {
        const data = (await res.json()) as { areas: { slug: string; name: string; type: string }[] };
        bestName = data.areas.find((a) => a.slug === slug && a.type === "metro")?.name ?? null;
      }
    } catch (error) {
      console.error("[where-to-live/og] data fetch failed", error);
    }
  }
  const story = searchParams.get("card") === "story";
  return new ImageResponse(
    <LivabilityShareCard variant={story ? "story" : "wide"} percent={percent} bestName={bestName} bestGrade={bestName ? grade : null} renderScale={3} />,
    {
      width: story ? STORY_IMAGE_WIDTH : SHARE_IMAGE_WIDTH,
      height: story ? STORY_IMAGE_HEIGHT : SHARE_IMAGE_HEIGHT,
      headers: { "Cache-Control": CACHE_CONTROL },
    }
  );
}
