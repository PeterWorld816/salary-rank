"use client";
// Loads (on demand, cached) and resolves the detailed-occupation, education
// and estimated-experience curves for the visitor's current answers — shared
// by ResultGuideTabs.tsx and PersonalizedResult.tsx so both show the same
// numbers. Nothing is fetched until the matching filter is actually picked.
//
// Each returned row carries the anchors it was computed from plus a note
// when that's a fallback curve, so callers never have to re-derive whether
// a number is the visitor's own combo or a broader stand-in.
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/LanguageProvider";
import { formatTemplate } from "@/lib/i18n";
import { getValueAtPercentile, type PercentileAnchor } from "@/lib/percentileTable";
import type { StateMeta } from "@/data/us/stateMeta";
import { US_AGE_BANDS, type UsInput } from "@/lib/usInput";
import { getOccupationCategory } from "@/lib/usOccupationIncome";
import {
  educationLabel,
  experienceLabel,
  fetchEducationFile,
  fetchEducationStateFile,
  fetchExperienceFile,
  fetchOccupationDetailFile,
  getOccupationDetail,
  resolveEducationCurve,
  resolveEducationMajorCurve,
  resolveEducationStateCurve,
  resolveExperienceCurve,
  resolveOccupationDetailCurve,
  resolveOccupationDetailStateCurve,
  type ResolvedCurve,
} from "@/lib/usEarningsDetail";

export type DetailedRowKey = "occupationDetail" | "occupationDetailState" | "education" | "educationState" | "educationMajor" | "experience";

export type DetailedRow = {
  key: DetailedRowKey;
  label: string;
  anchors: PercentileAnchor[];
  note: string | null;
  usedFallback: boolean;
};

type Files = {
  detail: Awaited<ReturnType<typeof fetchOccupationDetailFile>>;
  education: Awaited<ReturnType<typeof fetchEducationFile>>;
  experience: Awaited<ReturnType<typeof fetchExperienceFile>>;
  educationState: Awaited<ReturnType<typeof fetchEducationStateFile>>;
};

export function useDetailedEarnings(input: UsInput, state: StateMeta | null) {
  const { t, tr, lang } = useLanguage();
  const [files, setFiles] = useState<Files>({ detail: null, education: null, experience: null, educationState: null });
  const [loading, setLoading] = useState(false);

  const detailId = getOccupationDetail(input.occupationDetail)?.id ?? null;
  const educationId = input.education;
  const experienceOn = input.experience != null;
  const stateAbbr = state?.abbr ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!detailId && !educationId && !experienceOn) {
      setFiles({ detail: null, education: null, experience: null, educationState: null });
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      detailId ? fetchOccupationDetailFile(detailId) : Promise.resolve(null),
      educationId ? fetchEducationFile(educationId) : Promise.resolve(null),
      experienceOn ? fetchExperienceFile() : Promise.resolve(null),
      educationId && stateAbbr ? fetchEducationStateFile(stateAbbr, educationId) : Promise.resolve(null),
    ]).then(([detail, education, experience, educationState]) => {
      if (cancelled) return;
      setFiles({ detail, education, experience, educationState });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [detailId, educationId, experienceOn, stateAbbr]);

  const rows = useMemo<DetailedRow[]>(() => {
    const out: DetailedRow[] = [];
    const age = tr(US_AGE_BANDS.find((b) => b.id === input.ageBand)?.label ?? { en: input.ageBand, ko: input.ageBand });
    const push = (key: DetailedRowKey, label: string, c: ResolvedCurve | null) => {
      if (c) out.push({ key, label, anchors: c.anchors, note: c.reason ? c.reason[lang] : null, usedFallback: c.usedFallback });
    };

    const detail = getOccupationDetail(input.occupationDetail);
    if (detail && files.detail?.id === detail.id) {
      const name = tr(detail.label);
      push("occupationDetail", formatTemplate(t.usOccupationDetailPercentileLabelTemplate, { occupation: name }), resolveOccupationDetailCurve(files.detail, input.ageBand, input.gender));
      if (state) {
        const s = resolveOccupationDetailStateCurve(files.detail, state.abbr);
        if (s) push("occupationDetailState", formatTemplate(t.usOccupationDetailStatePercentileLabelTemplate, { occupation: name, state: state.name }), s);
      }
    }

    const edu = educationLabel(input.education);
    if (edu && files.education?.id === input.education) {
      const name = tr(edu);
      push("education", formatTemplate(t.usEducationPercentileLabelTemplate, { education: name, age }), resolveEducationCurve(files.education, input.ageBand, input.gender));
      if (state && files.educationState?.id === input.education && files.educationState.state === state.abbr.toLowerCase()) {
        const s = resolveEducationStateCurve(files.educationState, input.ageBand);
        if (s) push("educationState", formatTemplate(t.usEducationStatePercentileLabelTemplate, { education: name, state: state.name, age }), s);
      }
      const major = getOccupationCategory(input.occupation);
      if (major) {
        const m = resolveEducationMajorCurve(files.education, major.id);
        if (m) push("educationMajor", formatTemplate(t.usEducationMajorPercentileLabelTemplate, { education: name, group: tr(major.label) }), m);
      }
    }

    const exp = experienceLabel(input.experience);
    if (exp && input.experience && files.experience) {
      push(
        "experience",
        formatTemplate(t.usExperiencePercentileLabelTemplate, { experience: tr(exp) }),
        resolveExperienceCurve(files.experience, input.experience, input.education, input.gender)
      );
    }
    return out;
  }, [files, input.occupationDetail, input.education, input.experience, input.ageBand, input.gender, input.occupation, state, t, tr, lang]);

  // Per-age medians for the detailed occupation (same sex, nationwide) —
  // the guide's age curve uses this instead of the major-group one.
  const detailMedianByAge = useMemo(() => {
    if (!files.detail || files.detail.id !== input.occupationDetail) return null;
    const sex = input.gender === "female" ? "2" : "1";
    const buckets: [string, UsInput["ageBand"]][] = [
      ["25-34", "25-34"],
      ["35-44", "35-44"],
      ["45-54", "45-54"],
      ["55-64", "55-64"],
      ["65-99", "65plus"],
    ];
    return buckets
      .map(([b, ageBand]) => {
        const e = files.detail!.byAgeSex[`${b}|${sex}`];
        const median = e?.anchors ? getValueAtPercentile(e.anchors, 50) : null;
        return median != null ? { ageBand, median } : null;
      })
      .filter((p): p is { ageBand: UsInput["ageBand"]; median: number } => p != null);
  }, [files.detail, input.occupationDetail, input.gender]);

  return { rows, loading, detailMedianByAge };
}
