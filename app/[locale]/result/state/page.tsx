import { redirectToResultDashboard, type LegacyResultParams, type LegacyResultSearchParams } from "@/lib/legacyResultRedirect";

export default function StateResultRedirectPage({
  params,
  searchParams,
}: {
  params: LegacyResultParams;
  searchParams: LegacyResultSearchParams;
}) {
  redirectToResultDashboard(params, searchParams);
}
