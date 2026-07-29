// 소득 백분위와 자산 백분위를 비교해 "다음에 뭘 해보면 좋을지" 방향을 제시하는
// 규칙 기반 팁 생성기. 특정 종목/상품을 추천하지 않고, 저축률·비상자금·세제혜택
// 계좌·부채관리·분산 같은 일반적인 재무 원칙만 다룬다. 개인 맞춤 투자자문이
// 아니라는 문구(lib/i18n.ts의 adviceDisclaimer)와 항상 함께 노출한다.
//
// percentile은 "상위 %"라서 숫자가 작을수록 좋은 순위다. gap = 자산순위 - 소득순위가
// 클수록(양수) "소득에 비해 자산이 못 따라가고 있다"는 뜻이다.

import type { Localized } from "@/lib/i18n";
import type { AgeGroupId } from "@/lib/salaryCalc";

export type AdviceTip = {
  id: string;
  title: Localized;
  body: Localized;
};

function tip(id: string, title: Localized, body: Localized): AdviceTip {
  return { id, title, body };
}

export function generateAdvice(params: {
  salaryPercentile: number;
  netWorthPercentile: number;
  ageGroup: AgeGroupId;
}): AdviceTip[] {
  const { salaryPercentile, netWorthPercentile, ageGroup } = params;
  const gap = netWorthPercentile - salaryPercentile; // 양수 = 자산이 소득보다 뒤처짐
  const tips: AdviceTip[] = [];

  if (gap > 15) {
    tips.push(
      tip(
        "gap_behind_strong",
        { ko: "소득에 비해 자산이 더 천천히 쌓이고 있어요", en: "Your assets are growing slower than your income rank" },
        {
          ko: "소득 순위보다 자산 순위가 꽤 낮은 편이에요. 저축률(월 소득 대비 저축·투자 비중)을 먼저 점검해보고, 자동이체로 '먼저 저축, 나중에 소비' 구조를 만들어보세요.",
          en: "Your net worth rank is notably behind your income rank. Start by checking your savings rate (share of income you save or invest), and set up automatic transfers so saving happens before spending.",
        }
      )
    );
    tips.push(
      tip(
        "tax_advantaged_accounts",
        { ko: "세제혜택 계좌부터 채워보세요", en: "Fill tax-advantaged accounts first" },
        {
          ko: "연금저축·IRP·ISA처럼 세액공제나 비과세 혜택이 있는 계좌를 한도까지 활용하면 같은 저축으로도 자산 형성 속도를 높일 수 있어요.",
          en: "Accounts like pension savings, IRP, or ISA (Korea) offer tax deductions or exemptions — maxing these out first can speed up asset growth from the same savings amount.",
        }
      )
    );
  } else if (gap > 5) {
    tips.push(
      tip(
        "gap_behind_moderate",
        { ko: "조금만 더 저축·투자 비중을 늘려보세요", en: "A modest boost to saving & investing could help" },
        {
          ko: "소득 순위 대비 자산 순위가 약간 낮아요. 지출 구조를 한 번 점검하고, 저축률을 5%p 정도만 올려도 몇 년 뒤 격차가 눈에 띄게 줄어들어요.",
          en: "Your net worth rank trails your income rank a little. A quick spending review and even a 5pp bump in your savings rate can close the gap noticeably over a few years.",
        }
      )
    );
  } else if (gap < -5) {
    tips.push(
      tip(
        "gap_ahead",
        { ko: "소득 대비 자산 관리를 잘하고 계세요", en: "You're managing assets well relative to income" },
        {
          ko: "자산 순위가 소득 순위보다 앞서 있어요. 다만 부동산 등 한 자산에 쏠려 있지 않은지, 비상자금(생활비 3~6개월치)은 따로 확보돼 있는지 점검해보면 좋아요.",
          en: "Your net worth rank is ahead of your income rank — nicely done. Just double-check you're not over-concentrated in one asset (e.g. real estate) and that you have 3–6 months of living expenses set aside as an emergency fund.",
        }
      )
    );
  } else {
    tips.push(
      tip(
        "gap_balanced",
        { ko: "소득과 자산이 비슷한 속도로 쌓이고 있어요", en: "Income and assets are growing at a similar pace" },
        {
          ko: "지금 페이스를 유지하면서, 저축의 일부를 다양한 자산군(예적금·연금·투자)으로 나눠 분산해두면 장기적으로 변동성을 줄일 수 있어요.",
          en: "Keep this pace, and consider spreading your savings across a few asset types (deposits, pension, investments) to reduce long-term volatility.",
        }
      )
    );
  }

  if (ageGroup === "20s" || ageGroup === "30s") {
    tips.push(
      tip(
        "early_compound",
        { ko: "지금 시작하면 복리 효과가 가장 큽니다", en: "Starting now maximizes compounding" },
        {
          ko: "20~30대는 투자 기간이 가장 긴 시기예요. 소액이라도 지금 자동적립을 시작해두면, 나중에 더 큰 금액을 넣는 것보다 유리할 때가 많아요.",
          en: "Your 20s and 30s give you the longest investing runway. Starting small, automated contributions now often beats putting in larger amounts later.",
        }
      )
    );
  } else if (ageGroup === "40s" || ageGroup === "50s") {
    tips.push(
      tip(
        "midlife_diversify",
        { ko: "부채 정리와 은퇴 준비를 함께 챙기세요", en: "Balance debt payoff with retirement prep" },
        {
          ko: "고금리 부채가 있다면 우선 상환을 검토하고, 은퇴까지 남은 기간에 맞춰 자산 배분(투자 비중)을 점검해보세요.",
          en: "If you carry high-interest debt, prioritize paying it down, and review your asset allocation to fit the time you have left before retirement.",
        }
      )
    );
  } else {
    tips.push(
      tip(
        "near_retirement",
        { ko: "자산 인출 계획을 미리 세워보세요", en: "Plan how you'll draw down assets" },
        {
          ko: "은퇴 시기가 가까울수록 자산을 불리는 것만큼 '어떻게 안전하게 인출할지' 계획이 중요해요. 국민연금·개인연금 수령 시점과 생활비를 같이 계산해보세요.",
          en: "Closer to retirement, how safely you draw down assets matters as much as growing them. Map out pension payout timing alongside your expected living expenses.",
        }
      )
    );
  }

  return tips;
}
