"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import {
  genders,
  ageGroups,
  maritalStatuses,
  regions,
  seoulDistricts,
  companySizes,
  industries,
  encodeSalaryInput,
  type GenderId,
  type AgeGroupId,
  type MaritalStatusId,
  type RegionId,
  type SeoulDistrictId,
  type CompanySizeId,
  type IndustryId,
  type SalaryInput,
} from "@/lib/salaryCalc";
import StepSelectCard, { type StepOption } from "@/components/StepSelectCard";
import NumberInputCard from "@/components/NumberInputCard";

type StepKey =
  | "gender"
  | "ageGroup"
  | "marital"
  | "region"
  | "district"
  | "companySize"
  | "industry"
  | "salary"
  | "networth";

type Answers = Partial<{
  gender: GenderId;
  ageGroup: AgeGroupId;
  maritalStatus: MaritalStatusId;
  region: RegionId;
  district: SeoulDistrictId | null;
  companySize: CompanySizeId;
  industry: IndustryId;
  annualSalary: number;
  netWorth: number;
}>;

const SALARY_PRESETS = [3000, 4000, 5000, 7000, 10000, 15000];
const NETWORTH_PRESETS = [3000, 10000, 30000, 50000, 100000, 300000];

export default function QuizPage() {
  const { t, tr, lang } = useLanguage();
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);

  const stepKeys = useMemo<StepKey[]>(() => {
    const keys: StepKey[] = ["gender", "ageGroup", "marital", "region"];
    if (answers.region === "seoul") keys.push("district");
    keys.push("companySize", "industry", "salary", "networth");
    return keys;
  }, [answers.region]);

  const total = stepKeys.length;
  const currentKey = stepKeys[stepIndex];

  function goNext(patch: Partial<Answers>) {
    const next = { ...answers, ...patch };
    setAnswers(next);

    if (stepIndex < stepKeys.length - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    // 마지막 단계(networth) 완료 — SalaryInput으로 인코딩해 결과 페이지로 이동
    const input: SalaryInput = {
      ageGroup: next.ageGroup!,
      gender: next.gender!,
      maritalStatus: next.maritalStatus!,
      companySize: next.companySize!,
      industry: next.industry!,
      region: next.region!,
      district: next.region === "seoul" ? next.district ?? null : null,
      annualSalary: next.annualSalary!,
    };

    const params = new URLSearchParams({
      d: encodeSalaryInput(input),
      nw: String(next.netWorth ?? 0),
      lang,
    });
    router.push(`/kr/result?${params.toString()}`);
  }

  function goBack() {
    if (stepIndex === 0) return;
    setStepIndex(stepIndex - 1);
  }

  const toOptions = (list: { id: string; label: Record<"ko" | "en", string> }[]): StepOption[] =>
    list.map((entry) => ({ id: entry.id, label: tr(entry.label) }));

  return (
    <main className="min-h-screen bg-bg font-sans">
      <section className="px-6 sm:px-8 pt-12 pb-safe max-w-xl mx-auto fade-up">
        <Link href="/kr" className="inline-flex items-center gap-1 text-caption text-text-secondary mb-4 touch-target">
          <ChevronLeft className="w-4 h-4" />
          {t.home}
        </Link>

        <p className="text-caption text-text-tertiary mb-8">🔒 {t.privacyNotice}</p>

        {currentKey === "gender" && (
          <StepSelectCard
            title={t.stepGenderTitle}
            options={toOptions(genders)}
            step={stepIndex}
            total={total}
            onSelect={(id) => goNext({ gender: id as GenderId })}
          />
        )}

        {currentKey === "ageGroup" && (
          <StepSelectCard
            title={t.stepAgeGroupTitle}
            options={toOptions(ageGroups)}
            step={stepIndex}
            total={total}
            onSelect={(id) => goNext({ ageGroup: id as AgeGroupId })}
            onBack={goBack}
          />
        )}

        {currentKey === "marital" && (
          <StepSelectCard
            title={t.stepMaritalTitle}
            options={toOptions(maritalStatuses)}
            step={stepIndex}
            total={total}
            onSelect={(id) => goNext({ maritalStatus: id as MaritalStatusId })}
            onBack={goBack}
          />
        )}

        {currentKey === "region" && (
          <StepSelectCard
            title={t.stepRegionTitle}
            options={toOptions(regions)}
            step={stepIndex}
            total={total}
            onSelect={(id) => goNext({ region: id as RegionId, district: null })}
            onBack={goBack}
          />
        )}

        {currentKey === "district" && (
          <StepSelectCard
            title={t.stepDistrictTitle}
            options={toOptions(seoulDistricts)}
            step={stepIndex}
            total={total}
            onSelect={(id) => goNext({ district: id as SeoulDistrictId })}
            onBack={goBack}
            footer={
              <button
                onClick={() => goNext({ district: null })}
                className="w-full text-center text-caption text-text-tertiary underline underline-offset-2 py-2"
              >
                {t.stepDistrictSkip}
              </button>
            }
          />
        )}

        {currentKey === "companySize" && (
          <StepSelectCard
            title={t.stepCompanySizeTitle}
            options={toOptions(companySizes)}
            step={stepIndex}
            total={total}
            onSelect={(id) => goNext({ companySize: id as CompanySizeId })}
            onBack={goBack}
          />
        )}

        {currentKey === "industry" && (
          <StepSelectCard
            title={t.stepIndustryTitle}
            options={toOptions(industries)}
            step={stepIndex}
            total={total}
            onSelect={(id) => goNext({ industry: id as IndustryId })}
            onBack={goBack}
          />
        )}

        {currentKey === "salary" && (
          <NumberInputCard
            title={t.stepSalaryTitle}
            helper={t.stepSalaryHelper}
            unit={t.stepSalaryUnit}
            presets={SALARY_PRESETS}
            step={stepIndex}
            total={total}
            onSubmit={(value) => goNext({ annualSalary: value })}
            onBack={goBack}
          />
        )}

        {currentKey === "networth" && (
          <NumberInputCard
            title={t.stepNetWorthTitle}
            helper={t.stepNetWorthHelper}
            unit={t.stepNetWorthUnit}
            presets={NETWORTH_PRESETS}
            step={stepIndex}
            total={total}
            onSubmit={(value) => goNext({ netWorth: value })}
            onBack={goBack}
          />
        )}
      </section>
    </main>
  );
}
