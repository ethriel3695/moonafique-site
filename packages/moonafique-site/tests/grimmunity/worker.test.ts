import { afterAll, beforeAll, expect, it } from "vitest";
import { Pool } from "pg";
import { migrate } from "../../lib/grimmunity/migrations";
import { runWorker, workerAuthorized } from "../../lib/grimmunity/worker";
import type { Grimmunity } from "../../lib/grimmunity/service";

const url = new URL(process.env.GRIM_TEST_DATABASE_URL ?? "http://invalid");
if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/grim_test") throw new Error("Use a local grim_test database.");
const pool = new Pool({ connectionString: url.toString(), max: 5 });
beforeAll(() => migrate(pool));
afterAll(() => pool.end());
it("requires an exact strong worker credential", () => {
  const secret = "test-secret-with-at-least-32-characters";
  expect(workerAuthorized(null, secret)).toBe(false);
  expect(workerAuthorized("Bearer wrong", secret)).toBe(false);
  expect(workerAuthorized("Bearer short", "short")).toBe(false);
  expect(workerAuthorized(`Bearer ${secret}`, secret)).toBe(true);
});
it("does not overlap a running worker", async () => {
  const lease = await pool.connect();
  try {
    await lease.query("SELECT pg_advisory_lock(hashtext('grim:worker:sandbox'))");
    const result = await runWorker(pool, "sandbox", {} as Grimmunity, async () => []);
    expect(result).toEqual({ skipped: "already_running" });
  } finally {
    await lease.query("SELECT pg_advisory_unlock(hashtext('grim:worker:sandbox'))");
    lease.release();
  }
});
it("leaves an interest-only deployment independent of billing", async () => {
  await pool.query("DELETE FROM grim.program WHERE id='live'");
  expect(await runWorker(pool, "live", {} as Grimmunity, async () => [])).toEqual({ skipped: "billing_not_configured" });
  // Early return must release the transaction lease so the next run is possible.
  expect(await runWorker(pool, "live", {} as Grimmunity, async () => [])).toEqual({ skipped: "billing_not_configured" });
});
