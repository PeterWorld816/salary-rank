import type { Metadata } from "next";
import { localeFromParams, localeBase } from "@/lib/serverLocale";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/us/LegalPage";

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
        name: "US Census Bureau — American Community Survey (ACS) 5-Year Estimates",
        detail: "Median household income by state and county (tables B19013, B19001), plus the latest 1-Year estimate for states.",
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
        name: "미국 인구조사국(US Census Bureau) — ACS 5년 추정치(American Community Survey 5-Year Estimates)",
        detail: "주·카운티별 가구 중위소득(B19013, B19001 테이블), 주 단위 최신 1년 추정치.",
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

      <LegalSection heading={c.howHeading}>
        <p>{c.howBody}</p>
      </LegalSection>

      <LegalSection heading={c.disclaimerHeading}>
        <p>{c.disclaimerBody}</p>
      </LegalSection>
    </LegalPage>
  );
}
