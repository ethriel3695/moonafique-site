import { createHash } from "node:crypto";
import { parseCsv } from "./csv";
import { NOTION_COST_URL, type ReferenceImport } from "./costs";

const required = ["Inventory", "Filament", "Filament Used (g)", "Filament Cost ($/kg)", "Estimated Time (hrs)", "Hourly Machine Rate ($/hr)", "Number on Plate", "Packaging Cost", "Post-processing Cost (Paint, Sand, etc.)", "Total Cost (Per Print)"];
function numeric(value: string) {
  const clean = value.trim().replace(/^\$/, "");
  if (!clean) return null;
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(clean) || Number(clean) > 1_000_000) throw Error("invalid_reference_number");
  return Number(clean);
}
function relation(value: string) {
  return value.replace(/\s*\(https:\/\/[^)]+\)/g, "").split(",").map(v => v.trim()).filter(v => v && v !== "Untitled").join(", ").slice(0, 160);
}
export function importCostReference(csv: string, unit: "gram" | "kg", now = new Date()): ReferenceImport {
  if (Buffer.byteLength(csv) > 1_000_000) throw Error("reference_too_large");
  const source = parseCsv(csv, required, "notion");
  if (!source.length || source.length > 1000) throw Error("reference_row_limit");
  const seen = new Map<string, number>();
  let skipped = 0;
  const rows = source.flatMap(row => {
    const name = relation(row.Inventory);
    if (!name) { skipped++; return []; }
    const warnings: string[] = [];
    const unitsValue = numeric(row["Number on Plate"]), units = unitsValue || 1;
    if (!Number.isInteger(units) || units > 10000) throw Error("invalid_batch_size");
    if (!unitsValue) warnings.push("Batch size was blank or zero; confirm the one-unit assumption.");
    const prices = row["Filament Cost ($/kg)"].split(",").map(v => numeric(v)).filter(v => v !== null);
    if (prices.length !== 1) warnings.push("Material mix needs separate weights and prices; no blended cost was assumed.");
    const kgCents = prices.length === 1 ? Math.round(prices[0] * (unit === "gram" ? 100_000 : 100)) : null;
    const url = [...row.Inventory.matchAll(/(?:^|, )([^()]+)\((https:\/\/(?:app\.)?notion\.com\/[^)]+)\)/g)].find(match => match[1].trim() !== "Untitled")?.[2] ?? NOTION_COST_URL;
    const idBase = createHash("sha256").update(JSON.stringify(required.map(k => row[k]))).digest("hex").slice(0, 24);
    const occurrence = seen.get(idBase) ?? 0; seen.set(idBase, occurrence + 1);
    const money = (key: string) => { const value = numeric(row[key]); return value === null ? null : Math.round(value * 100); };
    return [{ id: `${idBase}-${occurrence}`, name, url, grams: numeric(row["Filament Used (g)"]), kgCents, filament: relation(row.Filament), hours: numeric(row["Estimated Time (hrs)"]), machineRate: money("Hourly Machine Rate ($/hr)"), units, packaging: money("Packaging Cost"), finishing: money("Post-processing Cost (Paint, Sand, etc.)"), reportedCost: money("Total Cost (Per Print)"), notes: (row.Notes ?? "").slice(0, 3000), warnings }];
  });
  if (!rows.length) throw Error("empty_reference");
  return { importedAt: now.toISOString(), unit, rows, skipped };
}
