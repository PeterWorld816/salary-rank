import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import UsShell from "./UsShell";
import Footer from "./Footer";

export function LegalPage({
  title,
  backLabel,
  backHref,
  children,
}: {
  title: string;
  backLabel: string;
  backHref: string;
  children: React.ReactNode;
}) {
  return (
    <UsShell>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-1 text-[13px] text-white/50 transition-colors hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <h1 className="mb-8 text-[26px] font-extrabold tracking-tight text-balance">{title}</h1>

        <div className="space-y-8 text-[14px] leading-relaxed text-white/70">{children}</div>

        <Footer />
      </div>
    </UsShell>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[16px] font-bold text-white/90">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
