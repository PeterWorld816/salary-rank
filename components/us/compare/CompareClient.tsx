"use client";
// The invite-link recipient's flow: form first, comparison after — see
// app/us/compare/[inviteId]/page.tsx for how inviterInput/state/county/place
// get here (decoded server-side from the link, no client fetch needed). The
// friend's own answers live in plain component state rather than a query
// param: unlike everything else under /us, they don't need to survive a
// refresh or be independently shareable — the "share this comparison"
// button on CompareResultCard below builds its own fresh invite link
// instead of pointing back at this in-memory state.
import { useState } from "react";
import type { StateMeta } from "@/data/us/stateMeta";
import type { UsCountyIncome, UsPlaceIncome } from "@/lib/usIncomeCalc";
import type { UsInput } from "@/lib/usInput";
import CompareFriendForm from "@/components/us/compare/CompareFriendForm";
import CompareResultCard from "@/components/us/compare/CompareResultCard";

export default function CompareClient({
  inviterInput,
  state,
  county,
  place,
  locationName,
}: {
  inviterInput: UsInput;
  state: StateMeta;
  county: UsCountyIncome;
  place: UsPlaceIncome | null;
  locationName: string;
}) {
  const [friendInput, setFriendInput] = useState<UsInput | null>(null);

  if (!friendInput) {
    return <CompareFriendForm locationName={locationName} onSubmit={setFriendInput} />;
  }

  return (
    <CompareResultCard
      inviterInput={inviterInput}
      friendInput={friendInput}
      state={state}
      county={county}
      place={place}
      locationName={locationName}
    />
  );
}
