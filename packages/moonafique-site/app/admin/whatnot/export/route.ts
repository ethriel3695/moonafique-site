import { requireStaff } from "@/lib/grimmunity/http";
import { database } from "@/lib/grimmunity/db";
import { readAnalytics } from "@/lib/whatnot-analytics/store";
import { dashboardFilters } from "@/lib/whatnot-analytics/metrics";
import { analyticsCsv } from "@/lib/whatnot-analytics/exports";
import { AnalyticsError } from "@/lib/whatnot-analytics/api";
import { analyticsFailure, privateHeaders } from "@/lib/whatnot-analytics/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireStaff();
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind");
    if (kind !== "ledger" && kind !== "shows" && kind !== "daily") throw new AnalyticsError("invalid_request");
    const { snapshot } = await readAnalytics(database());
    if (!snapshot) throw new AnalyticsError("configuration");
    const filters = dashboardFilters(Object.fromEntries(params), snapshot);
    return new Response(analyticsCsv(snapshot, filters, kind), { headers: { ...privateHeaders, "Content-Type": "text/csv; charset=utf-8", "X-Content-Type-Options": "nosniff", "Content-Disposition": `attachment; filename="moonafique-whatnot-${kind}-${filters.start}-${filters.end}-${filters.currency}.csv"` } });
  } catch (error) { return analyticsFailure(error); }
}
