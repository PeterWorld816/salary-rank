import { redirectToResultDashboard, type LegacyResultSearchParams } from "@/lib/legacyResultRedirect";

export default function StateResultRedirectPage({ searchParams }: { searchParams: LegacyResultSearchParams }) {
  redirectToResultDashboard(searchParams);
}
