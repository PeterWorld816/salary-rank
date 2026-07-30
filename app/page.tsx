// The US section (app/us) is now the site's front door. Rather than
// duplicating its content here, "/" just forwards straight into "/us",
// carrying over any query string (e.g. a shared ?d=...&lang=... link).
// The Korean statistics app that used to live here moved to app/kr — see
// components/BottomNav.tsx and components/us/UsHomeClient.tsx for the way
// back to it.
import { redirect } from "next/navigation";

type RawSP = Record<string, string | string[] | undefined>;

export default function RootPage({ searchParams }: { searchParams: RawSP }) {
  const qs = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) => (v == null ? [] : [[k, Array.isArray(v) ? v[0] : v]]))
  ).toString();
  redirect(qs ? `/us?${qs}` : "/us");
}
