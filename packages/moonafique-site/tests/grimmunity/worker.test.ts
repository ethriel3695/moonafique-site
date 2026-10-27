import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { migrate } from "../../lib/grimmunity/migrations";
import { runWorker, workerAuthorized } from "../../lib/grimmunity/worker";
import type { Grimmunity } from "../../lib/grimmunity/service";
import * as outbox from "../../lib/grimmunity/outbox";

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
it("delivers queued notices and reserves time for new ones when reconciliation exhausts its budget", async () => {
  let time = 0;
  const order: string[] = [];
  vi.spyOn(Date, "now").mockImplementation(() => time);
  vi.stubEnv("GRIM_SEND_EMAILS", "approved");
  vi.stubEnv("GRIM_SEND_INTEREST_EMAILS", "disabled");
  const send = vi.spyOn(outbox, "drainOutbox").mockImplementation(async (_pool, _mode, _send, options) => {
    order.push("notice");
    expect(options?.deadline).toBeGreaterThan(time);
    return { sent: 1 };
  });
  const query = async (sql: string) => ({ rows:
    sql.includes("pg_try_advisory") ? [{ locked: true }] :
    sql.includes("SELECT id FROM grim.program") ? [{ id: "sandbox" }] :
    sql.includes("SELECT * FROM grim.memberships") ? [{ id: "member", owner_id: "owner", customer_id: "customer", tier_snapshot: {} }] : [],
  });
  const fakePool = { query, connect: async () => ({ query, release() {} }) } as unknown as Pool;
  const service = {
    expireReservations: async () => {},
    refreshMember: async () => { order.push("reconcile"); time = 33_000; },
  } as unknown as Grimmunity;
  try {
    await runWorker(fakePool, "sandbox", service, async () => { throw Error("No time for more provider calls"); }, 40_000);
    expect(order).toEqual(["notice", "reconcile", "notice"]);
    expect(send).toHaveBeenCalledTimes(2);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  }
});
