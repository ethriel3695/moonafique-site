import { z } from "zod";
import type { AnalyticsSnapshot } from "./model";

export const NOTION_COST_URL = "https://app.notion.com/p/23db6a18af3f81e4a368d4bcf6cceda5?v=23db6a18af3f81a8bdfa000ce8496b72";
export const SUGGESTED_LABOR_CENTS = 2500;
const text = z.string().trim().max(160);
const amount = z.number().int().min(0).max(100_000_000).nullable();
const measured = z.number().min(0).max(1_000_000).nullable();
export const costInput = z.object({
  title: text.min(1), kind: z.enum(["standard", "custom", "development"]),
  date: z.iso.date(), status: z.enum(["planned", "making", "completed"]), archived: z.boolean(),
  units: z.number().int().min(0).max(10000),
  vaultUnits: z.number().int().min(0).max(10000).default(0),
  targetPrice: amount.default(null),
  soldUnits: z.number().int().min(0).max(10000).nullable().default(null),
  soldAsOf: z.iso.date().nullable().default(null),
  recordedGross: amount.default(null),
  unitAllocations: z.array(z.object({ orderId: z.string().trim().min(1).max(100), units: z.number().int().min(0).max(10000), reason: text.min(1) }).strict()).max(100).default([]),
  currency: z.literal("USD"),
  referenceId: z.string().max(100).nullable(),
  materials: z.array(z.object({ name: text.min(1), grams: measured, pricePerKg: amount }).strict()).max(40),
  machineHours: measured, machineRate: amount,
  extras: z.array(z.object({ name: text.min(1), cents: amount }).strict()).max(40),
  time: z.array(z.object({ person: text.min(1), activity: text.min(1), minutes: measured, rate: amount }).strict()).max(100),
  reviewed: z.boolean(), timeComplete: z.boolean(), receiptsComplete: z.boolean().default(false),
  revenue: z.enum(["none", "whatnot", "manual"]), orderIds: z.array(z.string().trim().min(1).max(100)).max(100),
  manualNet: z.number().int().min(-100_000_000).max(100_000_000).nullable(),
  notes: z.string().trim().max(3000),
}).strict().superRefine((v, ctx) => {
  if (v.vaultUnits > v.units || (v.soldUnits !== null && v.soldUnits > v.units - v.vaultUnits)) ctx.addIssue({ code: "custom", message: "Vault and sold copies cannot exceed the finished batch." });
  if ((v.soldUnits === null) !== (v.soldAsOf === null)) ctx.addIssue({ code: "custom", message: "Include a date with the recorded sales count." });
  if (v.recordedGross !== null && v.soldAsOf === null) ctx.addIssue({ code: "custom", message: "Date the recorded sales total." });
  if (new Set(v.unitAllocations.map(a => a.orderId)).size !== v.unitAllocations.length || v.unitAllocations.some(a => !v.orderIds.includes(a.orderId))) ctx.addIssue({ code: "custom", message: "Unit allocations must refer to unique linked orders." });
  if (new Set(v.orderIds).size !== v.orderIds.length || (v.revenue !== "whatnot" && v.orderIds.length) || (v.revenue === "whatnot" && !v.orderIds.length) || (v.revenue !== "manual" && v.manualNet !== null)) ctx.addIssue({ code: "custom", message: "Choose one earnings source." });
});
export type CostInput = z.infer<typeof costInput>;
export type CostReference = { id: string; name: string; url: string; grams: number | null; kgCents: number | null; filament: string; hours: number | null; machineRate: number | null; units: number; packaging: number | null; finishing: number | null; reportedCost: number | null; notes: string; warnings: string[] };
export type ReferenceImport = { importedAt: string; unit: "gram" | "kg"; rows: CostReference[]; skipped: number };
export type CostJob = { id: string; revision: number; data: CostInput; reference: (CostReference & { importedAt: string }) | null; updatedAt: string };
export type CostOrder = { id: string; title: string; at: string; currency: string; quantity: number; net: number; jobId: string | null };
export function costOrders(snapshot: AnalyticsSnapshot | null, links: { order_id: string; currency: string; job_id: string }[] = []): CostOrder[] {
  if (!snapshot) return [];
  const result = new Map<string, CostOrder>();
  for (const row of snapshot.ledger) {
    if (!row.orderId || row.currency !== "USD" || row.type !== "ORDER_EARNINGS") continue;
    const entry = result.get(row.orderId) ?? { id: row.orderId, title: row.title, at: row.at, currency: row.currency, quantity: 0, net: 0, jobId: links.find(l => l.order_id === row.orderId && l.currency === row.currency)?.job_id ?? null };
    entry.quantity += row.quantity;
    result.set(row.orderId, entry);
  }
  for (const row of snapshot.ledger) {
    const order = row.currency === "USD" ? result.get(row.orderId) : null;
    if (order) order.net += row.amount;
  }
  return [...result.values()].sort((a, b) => b.at.localeCompare(a.at));
}
export function allocatedUnits(job: CostInput, order: CostOrder) {
  return job.unitAllocations?.find(a => a.orderId === order.id)?.units ?? order.quantity;
}
export function costTotals(job: CostInput, orders: CostOrder[]) {
  const materialCost = Math.round(job.materials.reduce((n, row) => n + (row.grams ?? 0) * (row.pricePerKg ?? 0) / 1000, 0));
  const extrasCost = job.extras.reduce((n, row) => n + (row.cents ?? 0), 0);
  const machineCost = Math.round((job.machineHours ?? 0) * (job.machineRate ?? 0));
  const minutes = job.time.reduce((n, row) => n + (row.minutes ?? 0), 0);
  const laborCost = Math.round(job.time.reduce((n, row) => n + (row.minutes ?? 0) * (row.rate ?? 0) / 60, 0));
  const costsKnown = job.reviewed && job.materials.every(r => r.grams !== null && r.pricePerKg !== null) && job.extras.every(r => r.cents !== null) && job.machineHours !== null && job.machineRate !== null;
  const laborKnown = job.timeComplete && job.time.every(r => r.minutes !== null && r.rate !== null);
  const linked = job.orderIds.map(id => orders.find(o => o.id === id && o.currency === job.currency));
  const sellableUnits = job.units - (job.vaultUnits ?? 0);
  const linkedUnits = linked.reduce((n, o) => n + (o ? allocatedUnits(job, o) : 0), 0);
  const soldUnits = job.soldUnits ?? null;
  const remainingUnits = soldUnits === null ? null : sellableUnits - soldUnits;
  const targetGross = job.targetPrice == null ? null : sellableUnits * job.targetPrice;
  const enteredCost = materialCost + extrasCost + machineCost + laborCost;
  const linkValid = linked.length > 0 && linked.every(o => o !== undefined) && linkedUnits <= sellableUnits && linked.every(o => allocatedUnits(job, o!) <= o!.quantity);
  const net = job.revenue === "manual" ? job.manualNet : job.revenue === "whatnot" && linkValid ? linked.reduce((n, o) => n + o!.net, 0) : null;
  const cash = net !== null && costsKnown ? net - materialCost - extrasCost : null;
  const afterMachine = cash !== null ? cash - machineCost : null;
  const afterLabor = afterMachine !== null && laborKnown ? afterMachine - laborCost : null;
  const totalCost = costsKnown && laborKnown ? materialCost + extrasCost + machineCost + laborCost : null;
  return { receiptsKnown: job.receiptsComplete && net !== null, sellableUnits, linkedUnits, soldUnits, remainingUnits, targetGross, enteredCost,
    enteredPerSellable: sellableUnits > 0 ? Math.round(enteredCost / sellableUnits) : null,
    materialCost, extrasCost, machineCost, minutes, laborCost, costsKnown, laborKnown, net, cash, afterMachine, afterLabor, totalCost,
    perUnit: totalCost !== null && sellableUnits > 0 ? Math.round(totalCost / sellableUnits) : null,
    hourly: afterMachine !== null && job.timeComplete && job.time.every(r => r.minutes !== null) && minutes > 0 ? Math.round(afterMachine * 60 / minutes) : null };
}
export function newCostJob(date: string, reference?: CostReference, importedAt?: string): CostJob {
  return { id: crypto.randomUUID(), revision: 0, updatedAt: "", reference: reference ? { ...reference, importedAt: importedAt! } : null, data: {
    title: reference?.name ?? "", kind: reference ? "standard" : "custom", date, status: "planned", archived: false, vaultUnits: 0, targetPrice: null, soldUnits: null, soldAsOf: null, recordedGross: null, unitAllocations: [], units: reference?.units ?? 1, currency: "USD", referenceId: reference?.id ?? null,
    materials: reference ? [{ name: reference.filament || "Filament", grams: reference.grams, pricePerKg: reference.kgCents }] : [{ name: "Filament", grams: null, pricePerKg: null }],
    machineHours: reference?.hours ?? null, machineRate: reference?.machineRate ?? null,
    extras: [{ name: "Packaging", cents: reference?.packaging == null ? null : reference.packaging * reference.units }, { name: "Finishing / hardware", cents: reference?.finishing == null ? null : reference.finishing * reference.units }],
    time: [{ person: "Jess", activity: "Making / finishing", minutes: null, rate: SUGGESTED_LABOR_CENTS }],
    reviewed: false, timeComplete: false, receiptsComplete: false, revenue: "none", orderIds: [], manualNet: null, notes: "",
  } };
}
