import type { Metadata } from "next";
import { localeFromParams, localeBase } from "@/lib/serverLocale";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/us/LegalPage";

// Draft policy — have counsel review before relying on this for a real
// launch. Covers the clauses AdSense review looks for: what we collect,
// cookies/local storage, third-party ad & analytics cookies with opt-out
// links, children's privacy, and a contact point.
const COPY = {
  us: {
    metaTitle: "Privacy Policy — US Income Percentile",
    metaDescription: "How this site handles cookies, local storage, advertising, and analytics.",
    title: "Privacy Policy",
    backLabel: "Back home",
    updated: "Last updated: August 2026",
    sections: [
      {
        heading: "Overview",
        body: [
          "This Privacy Policy explains what information this site (the “Site”) collects and how it's used. We built the Site to run entirely in your browser: the income, net worth, and demographic figures you enter are used only to calculate your percentile and are never transmitted to, or stored on, our servers.",
        ],
      },
      {
        heading: "Information we collect",
        body: [
          "We do not require an account, and we do not collect names, email addresses, or financial account information through the Site's calculator.",
          "The values you enter (income, net worth, age band, etc.) stay in your browser. If you use the “compare with a friend” or “share” features, those values are encoded into the URL you choose to share — we don't log or store them separately.",
          "Like most websites, our hosting provider and any third-party services described below (advertising, analytics) may automatically collect standard technical data such as IP address, browser type, device type, and pages visited.",
        ],
      },
      {
        heading: "Cookies & local storage",
        body: [
          "The Site uses your browser's local storage to remember one thing: your language preference (English/Korean). This stays on your device and is never sent to us.",
          "Cookies are small text files a site can ask your browser to store. We don't set our own tracking cookies, but the third-party services below may set cookies of their own when you visit the Site — see the sections below for details and opt-out links.",
        ],
      },
      {
        heading: "Advertising",
        body: [
          "This Site may display ads served by third-party advertising companies, including Google AdSense. These companies may use cookies (including the DoubleClick DART cookie) or similar technologies to serve ads based on your prior visits to this and other websites, in order to show you ads that are more relevant to you.",
          "You can opt out of personalized advertising by visiting Google's Ads Settings (adssettings.google.com), or opt out of several third-party vendors' use of cookies for personalized advertising by visiting www.aboutads.info/choices.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "We may use analytics services (such as Google Analytics or Vercel Analytics) to understand how visitors use the Site — for example, which pages are viewed and how long visitors stay. These services may use cookies or similar technology and may collect the technical data described above. Any data collected this way is aggregated and is not linked to the calculator inputs you enter, since those never leave your browser.",
        ],
      },
      {
        heading: "Children's privacy",
        body: [
          "The Site is not directed at children under 13, and we do not knowingly collect personal information from children under 13.",
        ],
      },
      {
        heading: "Third-party links",
        body: [
          "The Site links to third-party data sources (e.g., the US Census Bureau, the Federal Reserve). We aren't responsible for the privacy practices of sites we link to — please review their own policies.",
        ],
      },
      {
        heading: "Changes to this policy",
        body: [
          "We may update this Privacy Policy from time to time. Changes take effect as soon as the updated policy is posted on this page.",
        ],
      },
      {
        heading: "Contact us",
        body: [
          "Questions about this policy? Visit the Contact page.",
        ],
      },
    ],
  },
  kr: {
    metaTitle: "개인정보처리방침 — 미국 소득 상위 몇 %?",
    metaDescription: "이 사이트의 쿠키, 로컬 저장소, 광고, 애널리틱스 처리 방식을 안내합니다.",
    title: "개인정보처리방침",
    backLabel: "홈으로",
    updated: "최종 수정일: 2026년 8월",
    sections: [
      {
        heading: "개요",
        body: [
          "이 개인정보처리방침은 본 사이트(이하 “사이트”)가 수집하는 정보와 그 사용 방식을 설명합니다. 이 사이트는 사용자의 브라우저 안에서만 동작하도록 만들어졌습니다 — 입력한 소득, 순자산, 인적 정보는 백분위 계산에만 사용되며, 저희 서버로 전송되거나 저장되지 않습니다.",
        ],
      },
      {
        heading: "수집하는 정보",
        body: [
          "이 사이트는 별도의 회원가입을 요구하지 않으며, 계산기를 통해 이름·이메일·금융계좌 정보를 수집하지 않습니다.",
          "입력하신 값(소득, 순자산, 연령대 등)은 브라우저 안에만 남아있습니다. “친구와 비교하기”나 “공유하기” 기능을 사용하면, 해당 값은 사용자가 직접 공유하기로 선택한 URL 안에 인코딩될 뿐 별도로 로그를 남기거나 저장하지 않습니다.",
          "대부분의 웹사이트와 마찬가지로, 호스팅 제공업체 및 아래 설명하는 제3자 서비스(광고, 애널리틱스)가 IP 주소, 브라우저 종류, 기기 종류, 방문한 페이지 등 일반적인 기술 정보를 자동으로 수집할 수 있습니다.",
        ],
      },
      {
        heading: "쿠키 및 로컬 저장소",
        body: [
          "이 사이트는 브라우저의 로컬 저장소(localStorage)를 사용해 언어 설정(한국어/영어) 한 가지만 기억합니다. 이 정보는 사용자의 기기에만 저장되며 저희에게 전송되지 않습니다.",
          "쿠키는 웹사이트가 브라우저에 저장을 요청하는 작은 텍스트 파일입니다. 저희는 자체 추적 쿠키를 사용하지 않지만, 아래에 설명된 제3자 서비스가 사이트 방문 시 자체 쿠키를 설정할 수 있습니다 — 자세한 내용과 수신 거부 방법은 아래 항목을 참고해주세요.",
        ],
      },
      {
        heading: "광고",
        body: [
          "이 사이트는 Google AdSense를 포함한 제3자 광고 업체가 제공하는 광고를 표시할 수 있습니다. 이들 업체는 쿠키(DoubleClick DART 쿠키 포함) 또는 유사한 기술을 사용하여, 사용자가 이전에 방문한 이 사이트와 다른 사이트 방문 기록을 기반으로 더 관련성 높은 광고를 보여줄 수 있습니다.",
          "맞춤 광고 수신을 거부하려면 Google 광고 설정(adssettings.google.com)을 방문하시거나, 여러 제3자 업체의 맞춤 광고용 쿠키 사용을 한 번에 거부하려면 www.aboutads.info/choices 를 방문해주세요.",
        ],
      },
      {
        heading: "애널리틱스",
        body: [
          "저희는 방문자가 사이트를 어떻게 이용하는지 파악하기 위해 Google Analytics, Vercel Analytics 등 애널리틱스 서비스를 사용할 수 있습니다. 이들 서비스는 쿠키 또는 유사 기술을 사용할 수 있으며, 위에서 설명한 기술 정보를 수집할 수 있습니다. 이렇게 수집된 데이터는 집계된 형태로만 사용되며, 브라우저를 벗어나지 않는 계산기 입력값과는 연결되지 않습니다.",
        ],
      },
      {
        heading: "아동 개인정보",
        body: [
          "이 사이트는 만 13세 미만 아동을 대상으로 하지 않으며, 만 13세 미만 아동의 개인정보를 고의로 수집하지 않습니다.",
        ],
      },
      {
        heading: "제3자 링크",
        body: [
          "이 사이트는 미국 인구조사국, 연방준비제도 등 제3자 데이터 출처로 연결되는 링크를 포함합니다. 링크된 사이트의 개인정보 처리방침에 대해서는 저희가 책임지지 않으며, 해당 사이트의 방침을 직접 확인해주세요.",
        ],
      },
      {
        heading: "방침 변경",
        body: [
          "이 개인정보처리방침은 수시로 변경될 수 있으며, 변경 사항은 이 페이지에 게시되는 즉시 효력이 발생합니다.",
        ],
      },
      {
        heading: "문의하기",
        body: [
          "이 방침에 대해 궁금한 점이 있으시면 문의 페이지를 방문해주세요.",
        ],
      },
    ],
  },
} as const;

type Params = { locale: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale = localeFromParams(params);
  const c = COPY[locale];
  return pageMetadata(locale, `${localeBase(locale)}/privacy`, c.metaTitle, c.metaDescription);
}

export default function PrivacyPage({ params }: { params: Params }) {
  const locale = localeFromParams(params);
  const c = COPY[locale];
  const backHref = localeBase(locale);

  return (
    <LegalPage title={c.title} backLabel={c.backLabel} backHref={backHref}>
      <p className="text-[12px] text-white/35">{c.updated}</p>
      {c.sections.map((s) => (
        <LegalSection key={s.heading} heading={s.heading}>
          {s.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </LegalSection>
      ))}
    </LegalPage>
  );
}
