"use client";
// Landing step for "see where you rank" links on the occupation/net-worth
// pages: pre-selects the occupation (or the age band + net worth field) in
// the shared in-memory answers, asks the input panel to open, and replaces
// itself with the calculator. Nothing from the visitor goes in the URL —
// only the slug that brought them here, which is public page data.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUsInput } from "@/components/us/UsInputContext";
import type { UsAgeBandId } from "@/lib/usInput";
import Spinner from "@/components/Spinner";

export default function CalculatorHandoff({
  target,
  occupation,
  occupationDetail,
  ageBand,
  openNetWorth = false,
}: {
  target: string;
  occupation?: string | null;
  occupationDetail?: string | null;
  ageBand?: UsAgeBandId;
  openNetWorth?: boolean;
}) {
  const router = useRouter();
  const { input, setInput, requestPanel, setMapLens } = useUsInput();

  useEffect(() => {
    setInput({
      ...input,
      ...(occupation !== undefined ? { occupation, occupationDetail: occupationDetail ?? null } : {}),
      ...(ageBand ? { ageBand } : {}),
    });
    if (occupation) setMapLens("personalized");
    requestPanel(openNetWorth ? "netWorth" : "main");
    router.replace(target);
    // Run once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#08090A" }}>
      <Spinner className="h-6 w-6 border-[3px] border-white/20 border-t-[#34D399]" />
    </div>
  );
}
