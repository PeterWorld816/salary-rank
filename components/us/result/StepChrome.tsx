"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import { useLocaleBase } from "@/lib/useLocaleBase";

export const RESULT_STEPS = ["overall", "state", "demographic"] as const;
export type ResultStepId = (typeof RESULT_STEPS)[number];

// Breadcrumb pills: current step + already-visited steps are clickable
// (jump back without losing your place), the step ahead is inert — "See
// next" is the one way forward, same as any step-by-step flow.
export function StepProgress({ step, qs }: { step: ResultStepId; qs: string }) {
  const { t } = useLanguage();
  const base = useLocaleBase();
  const idx = RESULT_STEPS.indexOf(step);
  const labels: Record<ResultStepId, string> = {
    overall: t.usResultStepOverallLabel,
    state: t.usResultStepStateLabel,
    demographic: t.usResultStepDemographicLabel,
  };

  return (
    <div className="mb-5 flex items-center gap-1.5">
      {RESULT_STEPS.map((s, i) => {
        const isCurrent = i === idx;
        const isPast = i < idx;
        const clickable = isCurrent || isPast;
        return (
          <div key={s} className="flex items-center gap-1.5">
            {clickable ? (
              <Link
                href={`${base}/result/${s}?${qs}`}
                aria-current={isCurrent ? "step" : undefined}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  isCurrent ? "bg-[#34D399]/15 text-[#34D399]" : "text-white/45 hover:text-white/75"
                }`}
              >
                {labels[s]}
              </Link>
            ) : (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/20">{labels[s]}</span>
            )}
            {i < RESULT_STEPS.length - 1 && <div className={`h-px w-3 ${isPast ? "bg-[#34D399]/40" : "bg-white/10"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export function StepHeader({
  step, title, intro, backHref, backLabel, qs,
}: {
  step: ResultStepId;
  title: string;
  intro: string;
  backHref: string;
  backLabel: string;
  qs: string;
}) {
  return (
    <>
      <Link
        href={backHref}
        className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <StepProgress step={step} qs={qs} />
      <h1 className="mb-2 text-[20px] font-extrabold tracking-tight text-balance">{title}</h1>
      <p className="mb-6 text-[13px] leading-relaxed text-white/50">{intro}</p>
    </>
  );
}

export function NextStepButton({ href, label }: { href: string; label?: string }) {
  const { t } = useLanguage();
  return (
    <Link
      href={href}
      className="mb-8 flex w-full items-center justify-center gap-1.5 rounded-md bg-[#34D399] py-3.5 text-[15px] font-bold text-[#04120C] transition-all hover:brightness-110 active:scale-[0.99]"
    >
      {label ?? t.usResultNextButton}
      <ChevronRight className="h-4 w-4" />
    </Link>
  );
}

export function MissingLocationFallback() {
  const { t } = useLanguage();
  const base = useLocaleBase();
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <p className="mb-2 text-[15px] font-semibold text-white/80">{t.usResultMissingLocationTitle}</p>
      <p className="mb-6 text-[13px] text-white/45">{t.usResultMissingLocationDesc}</p>
      <Link
        href={base}
        className="inline-block rounded-md border border-white/15 px-5 py-2.5 text-[14px] font-semibold text-white/80 transition-colors hover:border-[#34D399] hover:text-white"
      >
        {t.usResultMissingLocationCta}
      </Link>
    </div>
  );
}
