import type { Metadata } from "next";
import { localeFromParams, localeBase } from "@/lib/serverLocale";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/us/LegalPage";

const CONTACT_EMAIL = "rmfrmfyoutube@gmail.com";

const COPY = {
  us: {
    metaTitle: "Contact — US Income Percentile",
    metaDescription: "Get in touch with questions, feedback, or corrections.",
    title: "Contact",
    backLabel: "Back home",
    heading: "Get in touch",
    body: "Questions about how a number was calculated, feedback on the site, or spotted something wrong with the data? Reach out by email:",
  },
  kr: {
    metaTitle: "문의하기 — 미국 소득 상위 몇 %?",
    metaDescription: "질문, 피드백, 데이터 오류 제보는 이메일로 보내주세요.",
    title: "문의하기",
    backLabel: "홈으로",
    heading: "문의 방법",
    body: "계산 방식이 궁금하시거나, 사이트에 대한 의견, 데이터 오류 제보가 있으시면 아래 이메일로 연락해주세요:",
  },
} as const;

type Params = { locale: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const locale = localeFromParams(params);
  const c = COPY[locale];
  return pageMetadata(locale, `${localeBase(locale)}/contact`, c.metaTitle, c.metaDescription);
}

export default function ContactPage({ params }: { params: Params }) {
  const locale = localeFromParams(params);
  const c = COPY[locale];
  const backHref = localeBase(locale);

  return (
    <LegalPage title={c.title} backLabel={c.backLabel} backHref={backHref}>
      <LegalSection heading={c.heading}>
        <p>{c.body}</p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-block text-[15px] font-semibold text-[#34D399] hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      </LegalSection>
    </LegalPage>
  );
}
