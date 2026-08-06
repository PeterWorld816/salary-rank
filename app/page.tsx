// middleware.ts already redirects "/" to "/us" or "/kr" based on
// Accept-Language before this ever runs. This is just a fallback for the
// (in practice unreachable) case where middleware doesn't run.
import { redirect } from "next/navigation";
import { headers } from "next/headers";

type RawSP = Record<string, string | string[] | undefined>;

export default function RootPage({ searchParams }: { searchParams: RawSP }) {
  const qs = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) => (v == null ? [] : [[k, Array.isArray(v) ? v[0] : v]]))
  ).toString();
  const acceptLanguage = headers().get("accept-language") ?? "";
  const locale = acceptLanguage.split(",")[0]?.trim().toLowerCase().startsWith("ko") ? "kr" : "us";
  redirect(qs ? `/${locale}?${qs}` : `/${locale}`);
}
