import { redirectToResultDashboard, type LegacyResultParams, type LegacyResultSearchParams } from "@/lib/legacyResultRedirect";

export default function DemographicResultRedirectPage({
  params,
  searchParams,
}: {
  params: LegacyResultParams;
  searchParams: LegacyResultSearchParams;
}) {
  redirectToResultDashboard(params, searchParams);
}
