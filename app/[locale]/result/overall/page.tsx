import { redirectToResultDashboard, type LegacyResultSearchParams } from "@/lib/legacyResultRedirect";

export default function OverallResultRedirectPage({ searchParams }: { searchParams: LegacyResultSearchParams }) {
  redirectToResultDashboard(searchParams);
}
