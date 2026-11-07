import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/grimmunity/http";
import { database } from "@/lib/grimmunity/db";
import { readAnalytics, publicRefresh } from "@/lib/whatnot-analytics/store";
import { buildDashboard, dashboardFilters } from "@/lib/whatnot-analytics/metrics";
import { AnalyticsDashboard, StaffFrame } from "@/components/whatnot-analytics/dashboard";
import { RefreshReports } from "@/components/whatnot-analytics/refresh";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Whatnot business | Moonafique staff", robots: { index: false, follow: false, nocache: true } };
export default async function WhatnotAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Authorization precedes every database read and all private rendering.
  try { await requireStaff(); } catch { notFound(); }
  let data;
  try { data = await readAnalytics(database()); }
  catch { return <StaffFrame><h1 className="text-4xl">Whatnot business</h1><p role="alert" className="mt-5">The private report store is temporarily unavailable. Please try again shortly.</p></StaffFrame>; }
  if (!data.snapshot) return <StaffFrame><h1 className="text-4xl">Your Whatnot business, in one place.</h1><p className="my-6 max-w-2xl text-sm leading-7 text-muted-foreground">Import your financial, daily performance, and livestream reports to begin. This requests reports from Whatnot and saves them for staff analysis. Orders and inventory are unchanged.</p><RefreshReports initialJob={publicRefresh(data.refresh)} /></StaffFrame>;
  const filters = dashboardFilters(await searchParams, data.snapshot);
  return <AnalyticsDashboard snapshot={data.snapshot} filters={filters} data={buildDashboard(data.snapshot, filters)} refresh={publicRefresh(data.refresh)} />;
}
