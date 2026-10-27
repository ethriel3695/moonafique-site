import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import type { Pool } from "pg";
import { transaction, one } from "./db";
export async function migrate(pool: Pool) {
  for (const [version, filename] of [
    [1, "001_initial.sql"],
    [2, "002_tiers.sql"],
    [3, "003_interest.sql"],
    [4, "004_rolling_fulfillment_and_tax.sql"],
    [5, "005_worker.sql"],
    [6, "006_interest_confirmation.sql"],
    [7, "007_custom_requests.sql"],
    [8, "008_custom_request_emails.sql"],
    [9, "009_membership_collections.sql"],
    [10, "010_shippo_shipping.sql"],
    [11, "011_prepaid_shipping_notices.sql"],
    [12, "012_renewal_replacement.sql"],
  ] as const) {
    const sql = await readFile(
      path.join(process.cwd(), "db/grimmunity", filename),
      "utf8",
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    await transaction(pool, async (db) => {
      await db.query(
        "SELECT pg_advisory_xact_lock(hashtext('grim:migrations'))",
      );
      await db.query("CREATE SCHEMA IF NOT EXISTS grim");
      await db.query(
        "CREATE TABLE IF NOT EXISTS grim.schema_migrations(version integer PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
      );
      const applied = await one<{ checksum: string }>(
        db,
        "SELECT checksum FROM grim.schema_migrations WHERE version=$1",
        [version],
      );
      if (applied && applied.checksum !== checksum)
        throw new Error(
          "Migration checksum changed. Restore the applied migration and add a new migration.",
        );
      if (!applied) {
        await db.query(sql);
        await db.query(
          "INSERT INTO grim.schema_migrations(version,checksum) VALUES($1,$2)",
          [version, checksum],
        );
      }
    });
  }
}
