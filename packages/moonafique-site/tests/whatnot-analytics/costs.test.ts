import { expect, it } from "vitest";
import { costInput, costOrders, costTotals, newCostJob } from "../../lib/whatnot-analytics/costs";
import { importCostReference } from "../../lib/whatnot-analytics/cost-import";
import { exportCsv, parseCsv } from "../../lib/whatnot-analytics/csv";
import { ledger, snapshot } from "./fixtures";

export function referenceCsv(overrides: Record<string, string | number> = {}) {
  const row = { Inventory: "Example (https://app.notion.com/p/example)", Filament: "PLA", "Filament Used (g)": 200, "Filament Cost ($/kg)": .025, "Estimated Time (hrs)": 4, "Hourly Machine Rate ($/hr)": .48, "Number on Plate": 2, "Packaging Cost": .5, "Post-processing Cost (Paint, Sand, etc.)": 1, "Total Cost (Per Print)": 4.96, ...overrides };
  return exportCsv(Object.keys(row), [row]);
}
export function completeJob() {
  const job = newCostJob("2026-11-07").data;
  return { ...job, title: "Synthetic custom", units: 2, materials: [{ name: "PLA", grams: 250, pricePerKg: 2000 }, { name: "Accent", grams: 100, pricePerKg: 3000 }], extras: [{ name: "Packaging", cents: 200 }], machineHours: 10, machineRate: 50, time: [{ person: "Jess", activity: "Make", minutes: 60, rate: 2500 }, { person: "Reuben", activity: "Pack", minutes: 30, rate: 2500 }], reviewed: true, timeComplete: true, revenue: "manual" as const, manualNet: 10000 };
}
it("separates total job costs, cash, machine allowance, labor, and per-unit cost", () => {
  const t = costTotals(completeJob(), []);
  expect(t).toMatchObject({ materialCost: 800, extrasCost: 200, machineCost: 500, minutes: 90, laborCost: 3750, cash: 9000, afterMachine: 8500, afterLabor: 4750, totalCost: 5250, perUnit: 2625, hourly: 5667 });
  const failed = costTotals({ ...completeJob(), units: 0 }, []);
  expect(failed.perUnit).toBeNull(); expect(failed.materialCost).toBe(800);
});
it("does not turn missing costs, time, or receipts into zero profit", () => {
  expect(costTotals(newCostJob("2026-11-07").data, []).afterLabor).toBeNull();
  expect(costTotals({ ...completeJob(), reviewed: false }, []).cash).toBeNull();
  expect(costTotals({ ...completeJob(), time: [{ person: "Jess", activity: "Make", minutes: 60, rate: null }] }, [])).toMatchObject({ cash: 9000, afterLabor: null });
  expect(costTotals({ ...completeJob(), timeComplete: false }, []).hourly).toBeNull();
  expect(costTotals({ ...completeJob(), revenue: "none", manualNet: null }, []).net).toBeNull();
});
it("uses signed order ledger activity once, including refunds, without subtracting fees or provider COGS again", () => {
  const orders = costOrders(snapshot({ ledger: [ledger({ quantity: 2, amount: 10000, unitCost: 500 }), ledger({ id: "refund", type: "REFUND", amount: -2000 }), ledger({ id: "unallocated", orderId: "", amount: -300, type: "OTHER" }), ledger({ id: "eur", currency: "EUR", amount: 10000 })] }));
  expect(orders).toHaveLength(1); expect(orders[0]).toMatchObject({ quantity: 2, net: 8000 });
  expect(costTotals({ ...completeJob(), revenue: "whatnot", manualNet: null, orderIds: ["order-1"] }, orders).afterLabor).toBe(2750);
  expect(costTotals({ ...completeJob(), units: 1, revenue: "whatnot", orderIds: ["order-1"] }, orders).net).toBeNull();
});
it("imports explicit price units and keeps batch estimates distinct from per-unit packaging", () => {
  const imported = importCostReference(referenceCsv(), "gram");
  const ref = imported.rows[0];
  expect(ref).toMatchObject({ name: "Example", kgCents: 2500, grams: 200, units: 2, packaging: 50 });
  const job = newCostJob("2026-11-07", ref, imported.importedAt);
  expect(job.data.extras[0].cents).toBe(100); expect(job.data.machineHours).toBe(4); expect(job.data.reviewed).toBe(false);
  expect(importCostReference(referenceCsv({ "Filament Cost ($/kg)": 25 }), "kg").rows[0].kgCents).toBe(2500);
});
it("flags missing batch counts and ambiguous mixes, skips unnamed records, and rejects malformed imports", () => {
  const ref = importCostReference(referenceCsv({ "Filament Cost ($/kg)": "0.025,0.03", "Number on Plate": "" }), "gram").rows[0];
  expect(ref.kgCents).toBeNull(); expect(ref.warnings).toHaveLength(2);
  expect(() => importCostReference(referenceCsv({ Inventory: "" }), "gram")).toThrow();
  expect(() => importCostReference(referenceCsv({ "Filament Used (g)": "NaN" }), "gram")).toThrow();
  expect(() => parseCsv(referenceCsv())).toThrow(); // Financial header validation stays strict.
});
it("rejects forged fields, non-finite amounts, invalid dates, and mixed earnings sources", () => {
  expect(costInput.safeParse({ ...completeJob(), paid: true }).success).toBe(false);
  expect(costInput.safeParse({ ...completeJob(), machineHours: Infinity }).success).toBe(false);
  expect(costInput.safeParse({ ...completeJob(), date: "2026-02-30" }).success).toBe(false);
  expect(costInput.safeParse({ ...completeJob(), orderIds: ["order-1"] }).success).toBe(false);
});
