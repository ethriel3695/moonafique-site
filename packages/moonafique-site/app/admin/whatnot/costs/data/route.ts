import { z } from "zod";
import { requireStaff, sameOrigin } from "@/lib/grimmunity/http";
import { database } from "@/lib/grimmunity/db";
import { analyticsFailure, privateHeaders } from "@/lib/whatnot-analytics/http";
import { CostError, readCosts, saveCostJob, saveReferences } from "@/lib/whatnot-analytics/cost-store";
import { importCostReference } from "@/lib/whatnot-analytics/cost-import";
import { costTotals } from "@/lib/whatnot-analytics/costs";
import { exportCsv } from "@/lib/whatnot-analytics/csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const revision = z.number().int().min(0).max(1_000_000);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), id: z.uuid(), revision, data: z.unknown() }).strict(),
  z.object({ action: z.enum(["preview", "import"]), csv: z.string().max(1_000_000), unit: z.enum(["gram", "kg"]), revision }).strict(),
]);
function fail(error: unknown) {
  if (error instanceof CostError || error instanceof z.ZodError || error instanceof SyntaxError) {
    const code = error instanceof CostError ? error.code : "invalid";
    const messages = { conflict: "Someone saved a newer version. Your edits are still here. Reload the saved version before making changes.", order_link: "Check the linked orders: their total quantity must fit within this job’s sellable units, and each order can belong to only one job (including archived jobs).", reference_missing: "The Notion snapshot changed. Start again from the updated reference.", invalid: "Check the fields or CSV format. No changes were saved.", limit: "The job limit has been reached. Export your records and contact support." };
    return Response.json({ error: messages[code] }, { status: error instanceof CostError ? error.status : 400, headers: privateHeaders });
  }
  return analyticsFailure(error);
}
export async function GET(request: Request) {
  try {
    await requireStaff();
    const data = await readCosts(database());
    if (new URL(request.url).searchParams.get("export") !== "csv") return Response.json(data, { headers: privateHeaders });
    const rows = data.jobs.map(job => {
      const t = costTotals(job.data, data.orders);
      return { id: job.id, revision: job.revision, date: job.data.date, title: job.data.title, kind: job.data.kind, status: job.data.status, archived: job.data.archived, units: job.data.units, vault_units: job.data.vaultUnits, sellable_units: t.sellableUnits, recorded_sold_units: job.data.soldUnits, sales_count_as_of: job.data.soldAsOf, remaining_units: t.remainingUnits, target_price_cents: job.data.targetPrice, target_gross_cents: t.targetGross, recorded_gross_cents: job.data.recordedGross, unit_allocations: JSON.stringify(job.data.unitAllocations), linked_settled_units: t.linkedUnits, currency: job.data.currency, revenue_source: job.data.revenue, order_ids: job.data.orderIds.join(";"), net_cents: t.net, costs_reviewed: t.costsKnown, receipts_complete: job.data.receiptsComplete, time_complete: job.data.timeComplete, materials_cents: t.materialCost, other_cents: t.extrasCost, machine_cents: t.machineCost, hands_on_minutes: t.minutes, labor_cents: t.laborKnown ? t.laborCost : null, after_labor_cents: t.afterLabor, reference_date: job.reference?.importedAt, materials: JSON.stringify(job.data.materials), other_costs: JSON.stringify(job.data.extras), time_entries: JSON.stringify(job.data.time), notes: job.data.notes };
    });
    const headers = rows.length ? Object.keys(rows[0]) : ["id", "date", "title", "currency", "net_cents", "after_labor_cents"];
    return new Response(exportCsv(headers, rows), { headers: { ...privateHeaders, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="moonafique-job-costs.csv"' } });
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const staff = await requireStaff();
    const reader = request.body?.getReader();
    if (!reader) throw new CostError("invalid");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 1_500_000) { await reader.cancel(); throw new CostError("invalid"); } chunks.push(value); }
    const action = input.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (action.action === "save") return Response.json({ job: await saveCostJob(database(), action.id, action.revision, action.data, staff.id) }, { headers: privateHeaders });
    let references;
    try { references = importCostReference(action.csv, action.unit); } catch { throw new CostError("invalid"); }
    if (action.action === "import") await saveReferences(database(), references, action.revision, staff.id);
    return Response.json({ references }, { headers: privateHeaders });
  } catch (error) { return fail(error); }
}
