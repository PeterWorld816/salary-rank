import { redirectToResultDashboard, type LegacyResultParams, type LegacyResultSearchParams } from "@/lib/legacyResultRedirect";

export default function OverallResultRedirectPage({
  params,
  searchParams,
}: {
  params: LegacyResultParams;
  searchParams: LegacyResultSearchParams;
}) {
  redirectToResultDashboard(params, searchParams);
}
