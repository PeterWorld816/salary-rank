import { redirectToResultDashboard, type LegacyResultSearchParams } from "@/lib/legacyResultRedirect";

export default function DemographicResultRedirectPage({ searchParams }: { searchParams: LegacyResultSearchParams }) {
  redirectToResultDashboard(searchParams);
}
