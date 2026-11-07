import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/grimmunity/http";
import { database } from "@/lib/grimmunity/db";
import { readCosts } from "@/lib/whatnot-analytics/cost-store";
import { StaffFrame } from "@/components/whatnot-analytics/dashboard";
import { CostWorkspace } from "@/components/whatnot-analytics/cost-workspace";
import { shopDay } from "@/lib/whatnot-analytics/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Costs & time | Moonafique staff", robots: { index: false, follow: false, nocache: true } };
export default async function CostsPage() {
  try { await requireStaff(); } catch { notFound(); }
  let data;
  try { data = await readCosts(database()); }
  catch { return <StaffFrame><h1 className="text-4xl">Costs & time</h1><p role="alert" className="mt-5">The private cost store is temporarily unavailable. Please try again shortly.</p></StaffFrame>; }
  return <StaffFrame><CostWorkspace initial={data} today={shopDay(new Date().toISOString())} /></StaffFrame>;
}
