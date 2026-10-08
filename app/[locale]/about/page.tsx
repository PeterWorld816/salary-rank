import type { Metadata } from "next";
import { localeFromParams, localeBase } from "@/lib/serverLocale";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/us/LegalPage";
import { acs1Vintage, acs5YearRange } from "@/lib/usIncomeCalc";
import { SCHOOLING_YEARS_NOTE } from "@/lib/usEarningsDetail";

const COPY = {
  us: {
    metaTitle: "About — US Income Percentile",
    metaDescription: "What this site does, and where its income, net worth, and 401(k) data comes from.",
    title: "About this site",
    backLabel: "Back home",
    whatHeading: "What this is",
    whatBody:
      "This site lets you see where your income and net worth rank against the rest of the United States — by state, county, gender, marital status, and age. Enter your numbers once, then explore the map to compare yourself against real government and industry data.",
    sourcesHeading: "Data sources",
    sourcesIntro: "Every figure shown comes from one of the following public sources — nothing is estimated or made up:",
    sources: [
      {
        name: `US Census Bureau — American Community Survey (ACS) ${acs5YearRange} 5-Year Estimates`,
        detail: `Median household income by state, county, and town (tables B19013, B19001), median earnings by sex (B20017), and the latest ${acs1Vintage} 1-Year estimate for states. Occupation, education and estimated-experience figures come from the same ${acs5YearRange} ACS Public Use Microdata Sample (PUMS): personal earnings (PERNP, adjusted to 2024 dollars with ADJINC), person-weighted (PWGTP). Any combination with fewer than 100 survey records falls back to a broader group, and the result says so.`,
      },
      {
        name: "Federal Reserve — 2022 Survey of Consumer Finances (SCF)",
        detail: "Nationwide net worth percentile distribution.",
      },
      {
        name: "Vanguard — How America Saves 2026",
        detail: "Average and median 401(k) balances by age band.",
      },
    ],
    experienceHeading: "Estimated experience",
    experienceBody: `The ACS doesn't ask how many years someone has worked, so the experience filter uses "potential experience", a standard estimate from age and education. ${SCHOOLING_YEARS_NOTE.en} It's an estimate, not actual years worked: career breaks, part-time years, and later degrees aren't captured.`,
    howHeading: "How it works",
    howBody:
      "All calculations run locally in your browser. The numbers you enter are never sent to a server — they're only used to look up your position on the percentile curves built from the sources above.",
    disclaimerHeading: "Not financial advice",
    disclaimerBody:
      "This site is for informational and entertainment purposes only. It doesn't constitute financial, tax, or investment advice, and actual figures may differ from your real income, assets, or savings.",
  },
  kr: {
    metaTitle: "사이트 소개 — 미국 소득 상위 몇 %?",
    metaDescription: "이 사이트가 무엇을 하는지, 소득·순자산·401(k) 데이터가 어디서 오는지 소개합니다.",
    title: "사이트 소개",
    backLabel: "홈으로",
    whatHeading: "무엇을 하는 사이트인가요",
    whatBody:
      "이 사이트는 당신의 소득과 순자산이 미국 전체에서 어느 위치에 있는지 주(State)·카운티(County)·성별·결혼상태·연령대별로 확인할 수 있게 해줍니다. 정보를 한 번 입력한 뒤 지도를 탐색하며 실제 정부·기관 통계와 비교해보세요.",
    sourcesHeading: "데이터 출처",
    sourcesIntro: "이 사이트에 표시되는 모든 수치는 아래 공개 통계 출처에서 가져온 것이며, 임의로 추정하거나 만들어낸 값이 아닙니다:",
    sources: [
      {
        name: `미국 인구조사국(US Census Bureau) — ACS ${acs5YearRange} 5년 추정치(American Community Survey 5-Year Estimates)`,
        detail: `주·카운티·타운별 가구 중위소득(B19013, B19001 테이블), 성별 근로소득 중앙값(B20017), 주 단위 ${acs1Vintage} 1년 추정치. 직업·학력·추정 경력별 수치는 같은 ${acs5YearRange} ACS 표본 마이크로데이터(PUMS)의 개인 근로소득(PERNP, ADJINC로 2024년 달러 환산)을 개인 가중치(PWGTP)로 계산합니다. 표본이 100건 미만인 조합은 더 넓은 그룹으로 대체하고 화면에 표시합니다.`,
      },
      {
        name: "미국 연방준비제도(Federal Reserve) — 2022 소비자금융조사(Survey of Consumer Finances, SCF)",
        detail: "전국 단위 순자산 백분위 분포.",
      },
      {
        name: "뱅가드(Vanguard) — How America Saves 2026",
        detail: "연령대별 401(k) 평균·중앙값 잔액.",
      },
    ],
    experienceHeading: "추정 경력",
    experienceBody: `ACS에는 근무 연수 항목이 없어서, 경력 필터는 나이와 학력으로 계산하는 표준 방식인 "잠재 경력(potential experience)"을 씁니다. ${SCHOOLING_YEARS_NOTE.ko} 실제 근무 연수가 아니며, 경력 공백·파트타임·늦은 학위 취득 등은 반영되지 않습니다.`,
    howHeading: "작동 방식",
    howBody:
      "모든 계산은 사용자의 브라우저 안에서만 이뤄집니다. 입력한 숫자는 서버로 전송되지 않으며, 위 출처로 만든 백분위 곡선에서 당신의 위치를 찾는 데만 사용됩니다.",
    disclaimerHeading: "재무 자문이 아닙니다",
    disclaimerBody:
      "이 사이트는 정보 제공 및 재미를 위한 용도로만 제공됩니다. 재무·세무·투자 자문에 해당하지 않으며, 실제 소득·자산·저축 규모와 다를 수 있습니다.",
  },
} as const;

type Params = { locale: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale = localeFromParams(params);
  const c = COPY[locale];
  return pageMetadata(locale, `${localeBase(locale)}/about`, c.metaTitle, c.metaDescription);
}

export default function AboutPage({ params }: { params: Params }) {
  const locale = localeFromParams(params);
  const c = COPY[locale];
  const backHref = localeBase(locale);

  return (
    <LegalPage title={c.title} backLabel={c.backLabel} backHref={backHref}>
      <LegalSection heading={c.whatHeading}>
        <p>{c.whatBody}</p>
      </LegalSection>

      <LegalSection heading={c.sourcesHeading}>
        <p>{c.sourcesIntro}</p>
        <ul className="list-disc space-y-2 pl-5">
          {c.sources.map((s) => (
            <li key={s.name}>
              <span className="font-semibold text-white/85">{s.name}</span>
              <br />
              <span className="text-white/55">{s.detail}</span>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection heading={c.experienceHeading}>
        <p>{c.experienceBody}</p>
      </LegalSection>

      <LegalSection heading={c.howHeading}>
        <p>{c.howBody}</p>
      </LegalSection>

      <LegalSection heading={c.disclaimerHeading}>
        <p>{c.disclaimerBody}</p>
      </LegalSection>
    </LegalPage>
  );
}
