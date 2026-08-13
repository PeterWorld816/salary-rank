"use client";
// The actual side-by-side comparison — both percentiles computed with
// lib/usIncomeCalc.ts's getMostSpecificIncomePercentile (the exact same
// place/county/state/national fallback PersonalizedResult.tsx and
// useCompactResult.ts each already use for one person; this just calls it
// twice, once per side, instead of duplicating that fallback logic again).
import { useState } from "react";
import { Link2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";
import { formatTemplate } from "@/lib/i18n";
import { formatUsd } from "@/lib/usFormat";
import { getTier } from "@/lib/tier";
import { getMostSpecificIncomePercentile, type UsCountyIncome, type UsPlaceIncome } from "@/lib/usIncomeCalc";
import { buildCompareInviteHref, type UsInput } from "@/lib/usInput";
import TierBadge from "@/components/us/TierBadge";
import type { StateMeta } from "@/data/us/stateMeta";

export default function CompareResultCard({
  inviterInput,
  friendInput,
  state,
  county,
  place,
  locationName,
}: {
  inviterInput: UsInput;
  friendInput: UsInput;
  state: StateMeta;
  county: UsCountyIncome;
  place: UsPlaceIncome | null;
  locationName: string;
}) {
  const { t, lang } = useLanguage();
  const base = useLocaleBase();
  const [copied, setCopied] = useState(false);

  const youPercent = getMostSpecificIncomePercentile(inviterInput.annualIncome, state.fips, county, place);
  const friendPercent = getMostSpecificIncomePercentile(friendInput.annualIncome, state.fips, county, place);
  const youTier = youPercent != null ? getTier(youPercent) : null;
  const friendTier = friendPercent != null ? getTier(friendPercent) : null;

  // The viral loop continues from here: whoever is looking at this screen
  // (the original inviter's friend) becomes the *new* inviter — same link
  // builder PersonalizedResult's "Compare with a friend" button uses, just
  // fed this person's own answers instead. Still no server-side storage:
  // the new link re-encodes everything into its own URL from scratch.
  async function handleShareAgain() {
    const href = buildCompareInviteHref(base, friendInput, lang, state.abbr, county.fips, place?.fips ?? null);
    const url = `${window.location.origin}${href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: t.usComparePageTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed, or clipboard denied — either way, nothing
      // to recover: the button stays clickable for another attempt.
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <p className="mb-1 text-[13px] font-semibold text-[#34D399]">
        {formatTemplate(t.usCompareLocationContextTemplate, { location: locationName })}
      </p>
      <h2 className="mb-5 text-[17px] font-bold text-white/90">{t.usCompareCardTitle}</h2>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="mb-2 text-[12px] font-semibold text-white/50">{t.usCompareCardYou}</p>
          {youTier && (
            <div className="mb-2 flex justify-center">
              <TierBadge tier={youTier} />
            </div>
          )}
          <div className="text-[28px] font-extrabold leading-none tracking-tight text-[#FBBF24]">
            {youPercent != null ? formatTemplate(t.topPercentTemplate, { percent: youPercent }) : "—"}
          </div>
          <p className="mt-1 text-[12px] text-white/40">{formatUsd(inviterInput.annualIncome)}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="mb-2 text-[12px] font-semibold text-white/50">{t.usCompareCardFriend}</p>
          {friendTier && (
            <div className="mb-2 flex justify-center">
              <TierBadge tier={friendTier} />
            </div>
          )}
          <div className="text-[28px] font-extrabold leading-none tracking-tight text-[#34D399]">
            {friendPercent != null ? formatTemplate(t.topPercentTemplate, { percent: friendPercent }) : "—"}
          </div>
          <p className="mt-1 text-[12px] text-white/40">{formatUsd(friendInput.annualIncome)}</p>
        </div>
      </div>

      {youPercent != null && friendPercent != null && (
        <p className="mb-6 text-center text-[14px] font-semibold leading-snug text-white/80">
          {formatTemplate(t.usCompareResultSentenceTemplate, { youPercent, friendPercent })}
        </p>
      )}

      <button
        type="button"
        onClick={handleShareAgain}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-white/15 py-3 text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
      >
        <Link2 className="h-4 w-4" />
        {copied ? t.usCompareCopiedShort : t.usCompareShareAgainButton}
      </button>
    </div>
  );
}
