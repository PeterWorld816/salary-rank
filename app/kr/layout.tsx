import type { Metadata } from "next";
import { translations } from "@/lib/i18n";

// Restores the Korean-app title/description for this whole subtree — the
// root layout's metadata now defaults to the US section since "/" redirects
// there. app/kr/result overrides this per-page via its own generateMetadata.
export const metadata: Metadata = {
  title: translations.ko.appTitle,
  description: translations.ko.tagline,
  openGraph: {
    title: translations.ko.appTitle,
    description: translations.ko.tagline,
    type: "website",
  },
};

export default function KrLayout({ children }: { children: React.ReactNode }) {
  return children;
}
