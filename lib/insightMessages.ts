// "Coaching insight" message builder for the result dashboard
// (components/us/result/CoachingInsightCard.tsx). Given a person's age band,
// income, and (optionally) net worth/401(k), produces a short, empathetic,
// age-and-situation-aware narrative — never just a bare percentile.
//
// Every statistic used here comes from lib/insightBenchmarks.ts (or from
// data/us/netWorthByAge.json / data/us/401kByAge.json, already cited
// elsewhere in the app) — this file contains no invented numbers, and never
// recommends a specific investment product or ticker.
import { formatTemplate, type LangCode } from "@/lib/i18n";
import type { UsAgeBandId } from "@/lib/usInput";
import {
  FIDELITY_SAVINGS_MULTIPLIER_MILESTONES,
  AGE_BAND_TO_SAVINGS_MULTIPLIER_TARGET,
  IRS_2026_401K_LIMITS,
  FED_SHED_RETIREMENT_ON_TRACK_PERCENT_2024,
} from "@/lib/insightBenchmarks";

export type InsightTone = "strong" | "steady" | "building";

export type CoachingInsightInput = {
  lang: LangCode;
  ageBand: UsAgeBandId;
  annualIncome: number; // always > 0 (see lib/usInput.ts's decodeUsInput)
  netWorth: number | null; // excludes 401k, matches lib/usInput.ts's UsInput.netWorth
  k401: number | null;
  // "Top X%" convention, lower is better — pass the most specific figure
  // available (age-band-relative preferred, overall national as fallback).
  incomePercentile: number | null;
  netWorthPercentile: number | null;
};

export type CoachingInsight = {
  tone: InsightTone;
  headline: string;
  paragraphs: string[];
  sourceNote: string;
  disclaimer: string;
};

// 55-64/65plus are unambiguously 50+ (IRS catch-up eligible); 45-54 spans
// 45-49 (not eligible) and 50-54 (eligible), so it gets a conditional
// mention rather than a flat statement.
function getCatchUpEligibility(ageBand: UsAgeBandId): "eligible" | "maybe" | "none" {
  if (ageBand === "55-64" || ageBand === "65plus") return "eligible";
  if (ageBand === "45-54") return "maybe";
  return "none";
}

function milestoneAgeForMultiplier(multiplier: number): number | null {
  return FIDELITY_SAVINGS_MULTIPLIER_MILESTONES.find((m) => m.multiplier === multiplier)?.age ?? null;
}

export function buildCoachingInsight(input: CoachingInsightInput): CoachingInsight {
  const { lang, ageBand, annualIncome, netWorth, k401, incomePercentile, netWorthPercentile } = input;
  const ko = lang === "ko";

  const bestPercentile = [incomePercentile, netWorthPercentile]
    .filter((p): p is number => p != null)
    .reduce<number | null>((min, p) => (min == null || p < min ? p : min), null);

  const tone: InsightTone =
    bestPercentile == null ? "steady" : bestPercentile <= 30 ? "strong" : bestPercentile >= 65 ? "building" : "steady";

  const hasAssetData = netWorth != null || k401 != null;
  const targetMultiplier = AGE_BAND_TO_SAVINGS_MULTIPLIER_TARGET[ageBand] ?? null;
  const milestoneAge = targetMultiplier != null ? milestoneAgeForMultiplier(targetMultiplier) : null;
  const currentMultiplier = hasAssetData && annualIncome > 0 ? ((netWorth ?? 0) + (k401 ?? 0)) / annualIncome : null;
  const progressPercent =
    targetMultiplier != null && currentMultiplier != null ? Math.round((currentMultiplier / targetMultiplier) * 100) : null;

  const eligibility = getCatchUpEligibility(ageBand);
  const sourcesUsed = new Set<"fidelity" | "fedshed" | "irs">();
  const paragraphs: string[] = [];

  // ── Headline ──
  const headline =
    tone === "strong"
      ? ko
        ? "지금 잘하고 있어요 — 또래보다 앞서 있어요."
        : "You're doing well — ahead of a lot of people your age."
      : tone === "building"
        ? ko
          ? "당신만 그런 게 아니에요."
          : "You're not the only one in this spot."
        : ko
          ? "꾸준히 잘 나아가고 있어요."
          : "You're making steady progress.";

  // ── Acknowledgment ──
  if (tone === "strong") {
    paragraphs.push(
      ko
        ? "소득·자산 모두 또래 대비 상위권이에요. 잘 해오신 거 맞아요 — 여기서 조금 더 다듬을 부분만 짚어볼게요."
        : "Your income and net worth both rank near the top for your age group — you've clearly been doing something right. Here's a bit more to sharpen."
    );
  } else if (tone === "building") {
    paragraphs.push(
      ko
        ? "지금 숫자가 마음에 안 들 수도 있지만, 부끄러워할 일은 아니에요. 나이나 상황과 상관없이 많은 사람이 비슷한 고민을 해요."
        : "The numbers right now might not feel great, but there's nothing to be embarrassed about — plenty of people, at every age, are in a similar spot."
    );
  } else {
    paragraphs.push(
      ko
        ? "또래 평균 근처에서 착실히 나아가고 있어요. 지금 페이스를 유지하면서 조금씩 더 붙여나가면 돼요."
        : "You're tracking near the middle of the pack for your age — a solid place to build from with steady, incremental progress."
    );
  }

  // ── Quantitative Fidelity-multiplier comparison ──
  if (targetMultiplier != null && milestoneAge != null) {
    if (progressPercent != null && currentMultiplier != null) {
      paragraphs.push(
        ko
          ? formatTemplate(
              "Fidelity의 은퇴저축 가이드라인은 만 {age}세까지 연소득의 {target}배를 모으는 걸 목표로 제시해요. 지금 (401(k)+자산)은 연소득의 약 {current}배로, 이 목표의 약 {percent}%를 달성한 상태예요.",
              { age: milestoneAge, target: targetMultiplier, current: currentMultiplier.toFixed(1), percent: progressPercent }
            )
          : formatTemplate(
              "Fidelity's age-based guideline suggests aiming for about {target}x your annual income saved by around age {age}. Right now, your (401(k) + net worth) is about {current}x your income — roughly {percent}% of that benchmark.",
              { age: milestoneAge, target: targetMultiplier, current: currentMultiplier.toFixed(1), percent: progressPercent }
            )
      );
    } else {
      paragraphs.push(
        ko
          ? formatTemplate(
              "참고로 Fidelity의 가이드라인은 만 {age}세까지 연소득의 {target}배 저축을 목표로 제시해요. 순자산이나 401(k) 잔액을 입력하면 지금 얼마나 도달했는지 계산해드려요.",
              { age: milestoneAge, target: targetMultiplier }
            )
          : formatTemplate(
              "For reference, Fidelity's guideline suggests aiming for about {target}x your annual income saved by around age {age}. Add your net worth or 401(k) balance above to see exactly how close you are.",
              { age: milestoneAge, target: targetMultiplier }
            )
      );
    }
    sourcesUsed.add("fidelity");
  } else {
    paragraphs.push(
      ko
        ? "아직 Fidelity 가이드라인의 첫 기준(만 30세, 연소득의 1배)에 도달할 나이는 아니에요. 지금부터 꾸준히 저축률을 쌓아가면 충분해요."
        : "You're not yet at Fidelity's first milestone age (30, with a target of 1x your income) — steadily building your savings rate now is exactly what matters at this stage."
    );
    sourcesUsed.add("fidelity");
  }

  // ── Tone-specific action tip (+ "not alone" stat for the building tone) ──
  if (tone === "strong") {
    paragraphs.push(
      ko
        ? "다음 단계로는 401(k)·IRA 같은 세제혜택 계좌의 연간 한도를 최대한 채우고, 포트폴리오가 한쪽에 쏠리지 않았는지 분산 상태를 점검해보세요."
        : "A good next step: keep maxing out tax-advantaged accounts like your 401(k)/IRA up to the annual limit, and double-check your portfolio isn't overly concentrated in one place."
    );
  } else if (tone === "building") {
    paragraphs.push(
      ko
        ? formatTemplate(
            "실제로 Federal Reserve의 2024년 조사에서도 은퇴 미준비자 중 '저축이 순조롭다'고 답한 비율은 {percent}%에 불과했어요 — 당신만의 문제가 아니에요.",
            { percent: FED_SHED_RETIREMENT_ON_TRACK_PERCENT_2024 }
          )
        : formatTemplate(
            "In the Federal Reserve's own 2024 survey, only {percent}% of non-retired adults said their retirement savings felt on track — this isn't just you.",
            { percent: FED_SHED_RETIREMENT_ON_TRACK_PERCENT_2024 }
          )
    );
    sourcesUsed.add("fedshed");

    if (eligibility === "eligible") {
      paragraphs.push(
        ko
          ? formatTemplate(
              "지금부터 할 수 있는 구체적인 방법 하나: 만 50세 이상이면 IRS 규정상 401(k) 표준 한도(2026년 기준 ${standard})보다 연 ${catchup} 더 넣을 수 있는 'catch-up contribution'을 쓸 수 있어요. 만 60~63세는 그 대신 연 ${superCatchup}까지 늘어나요. 아직 늦지 않았어요.",
              {
                standard: IRS_2026_401K_LIMITS.standardLimit.toLocaleString(),
                catchup: IRS_2026_401K_LIMITS.catchUp50Plus.toLocaleString(),
                superCatchup: IRS_2026_401K_LIMITS.catchUpSuper60to63.toLocaleString(),
              }
            )
          : formatTemplate(
              "One concrete lever you have now: since you're 50 or older, the IRS lets you add a \"catch-up contribution\" to your 401(k) on top of the standard 2026 limit of ${standard} — an extra ${catchup} a year (${superCatchup} instead, if you're 60 to 63). It's not too late to use it.",
              {
                standard: IRS_2026_401K_LIMITS.standardLimit.toLocaleString(),
                catchup: IRS_2026_401K_LIMITS.catchUp50Plus.toLocaleString(),
                superCatchup: IRS_2026_401K_LIMITS.catchUpSuper60to63.toLocaleString(),
              }
            )
      );
      sourcesUsed.add("irs");
    } else if (eligibility === "maybe") {
      paragraphs.push(
        ko
          ? formatTemplate(
              "만 50세를 넘겼다면 참고할 것: IRS 규정상 401(k) 표준 한도(2026년 ${standard}) 위에 연 ${catchup}를 추가로 넣을 수 있는 catch-up contribution 제도가 있어요. 늦은 게 아니에요.",
              { standard: IRS_2026_401K_LIMITS.standardLimit.toLocaleString(), catchup: IRS_2026_401K_LIMITS.catchUp50Plus.toLocaleString() }
            )
          : formatTemplate(
              "Worth knowing if you've crossed 50: the IRS lets you add an extra ${catchup} a year to a 401(k) beyond the standard 2026 limit of ${standard} through a catch-up contribution. It's not too late.",
              { standard: IRS_2026_401K_LIMITS.standardLimit.toLocaleString(), catchup: IRS_2026_401K_LIMITS.catchUp50Plus.toLocaleString() }
            )
      );
      sourcesUsed.add("irs");
    } else {
      paragraphs.push(
        ko
          ? "지금 할 수 있는 건 저축률을 조금씩 올리고, 회사가 401(k) 매칭을 해준다면 그 매칭을 전액 받는 것, 그리고 고금리 부채부터 정리하는 거예요. 작은 변화도 시간이 지나면 크게 쌓여요."
          : "What you can do now: nudge your savings rate up a little at a time, make sure you're capturing any employer 401(k) match in full, and knock out high-interest debt first. Small changes compound a lot over time."
      );
    }
  } else {
    paragraphs.push(
      ko
        ? "저축률을 1~2%p만 더 올려보거나, 회사 401(k) 매칭을 빠짐없이 받고 있는지 확인해보세요. 크지 않은 조정만으로도 목표 배수에 꾸준히 가까워질 수 있어요."
        : "Consider nudging your savings rate up by a percentage point or two, and make sure you're capturing your full employer 401(k) match. Small adjustments like these steadily close the gap to your target multiple."
    );
  }

  // ── Source note (only the sources actually referenced above) ──
  const sourceLines: string[] = [];
  if (sourcesUsed.has("fidelity")) sourceLines.push(ko ? "Fidelity 연령대별 저축 가이드라인" : "Fidelity's age-based savings guidelines");
  if (sourcesUsed.has("fedshed"))
    sourceLines.push("Federal Reserve, Economic Well-Being of U.S. Households (2024)");
  if (sourcesUsed.has("irs")) sourceLines.push(ko ? "IRS 2026년 401(k) 기여 한도" : "IRS 2026 401(k) contribution limits");
  sourceLines.push(
    ko
      ? "Federal Reserve SCF · Vanguard How America Saves (연령대별 자산·401(k) 데이터)"
      : "Federal Reserve SCF · Vanguard How America Saves (age-band net worth/401(k) data)"
  );
  const sourceNote = ko ? `근거: ${sourceLines.join(" · ")}` : `Based on: ${sourceLines.join(" · ")}`;

  const disclaimer = ko
    ? "이 내용은 공개된 조사자료에 기반한 일반적인 교육 정보이며, 개인 맞춤형 재무 자문이 아닙니다."
    : "This is general educational information based on public research, not personalized financial advice.";

  return { tone, headline, paragraphs, sourceNote, disclaimer };
}
