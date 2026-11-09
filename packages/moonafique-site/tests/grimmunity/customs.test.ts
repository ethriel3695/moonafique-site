import sharp from "sharp";
import { referencePhoto } from "../../lib/customs/photos";
import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { migrate } from "../../lib/grimmunity/migrations";
import { submitRequest, requestQueue, updateRequest } from "../../lib/customs/store";
import { readRequestBody } from "../../lib/customs/http";
import { shopToday } from "../../lib/customs/model";

const url = new URL(process.env.GRIM_TEST_DATABASE_URL ?? "http://invalid");
if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/grim_test")
  throw new Error("Use a disposable local grim_test database.");
const pool = new Pool({ connectionString: url.toString(), max: 10 });
const secret = "fixture-custom-request-secret-at-least-32-characters";
const now = new Date("2026-10-24T12:00:00Z");
const input = (overrides = {}) => ({ submissionKey: randomUUID(), name: "Test visitor", email: "visitor@example.invalid", request: "A purple keepsake with a butterfly.", hasDeadline: false, acknowledged: true, ...overrides });
const submit = (data: unknown = input(), ip = "192.0.2.1") => submitRequest(pool, "sandbox", data, ip, secret, now);
beforeAll(() => migrate(pool));
beforeEach(() => pool.query("TRUNCATE customs.requests,customs.rate_limits CASCADE"));
afterAll(() => pool.end());

describe("custom request queue", () => {
  it("accepts either contact method and preserves details without creating a membership", async () => {
    const interestBefore = (await pool.query("SELECT count(*) FROM grim.interest")).rows[0].count;
    const membersBefore = (await pool.query("SELECT count(*) FROM grim.memberships")).rows[0].count;
    await submit(input({ email: " VISITOR@EXAMPLE.INVALID " }));
    await submit(input({ email: "", whatnotUsername: "@whatnot_fixture", hasDeadline: true, neededBy: "2026-11-15", occasion: "Birthday", details: "Purple and gold." }));
    const queue = await requestQueue(pool, "sandbox");
    expect(queue.total).toBe(2);
    expect(queue.rows[1]).toMatchObject({ email: null, whatnot_username: "whatnot_fixture", needed_by: "2026-11-15", occasion: "Birthday", details: "Purple and gold.", status: "new" });
    expect(queue.rows[0].email).toBe("visitor@example.invalid");
    expect((await pool.query("SELECT count(*) FROM grim.interest")).rows[0].count).toBe(interestBefore);
    expect((await pool.query("SELECT count(*) FROM grim.memberships")).rows[0].count).toBe(membersBefore);
  });
  it("atomically saves photos, keeps retries idempotent, and isolates modes", async () => {
    const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "purple" } }).png().toBuffer();
    const photo = new File([new Uint8Array(bytes)], "private-name.png", { type: "image/png" });
    const data = input();
    const save = () => submitRequest(pool, "sandbox", data, "192.0.2.1", secret, now, { photos: [photo] });
    const ids = await Promise.all([save(), save()]);
    expect(ids[0]).toBe(ids[1]);
    const row = (await requestQueue(pool, "sandbox")).rows[0];
    expect(row.photos).toHaveLength(1);
    expect(row.photos[0]).not.toHaveProperty("data");
    const stored = await referencePhoto(pool, "sandbox", row.photos[0].id);
    expect((await sharp(stored!.data).metadata()).format).toBe("webp");
    expect(await referencePhoto(pool, "live", row.photos[0].id)).toBeUndefined();
    const messages = JSON.stringify((await pool.query("SELECT message FROM customs.notifications")).rows);
    expect(messages).toContain("1 reference photo");
    expect(messages).not.toContain("private-name.png");
    expect(messages).not.toContain(row.photos[0].id);
    await pool.query("DELETE FROM customs.requests WHERE id=$1", [ids[0]]);
    expect(await referencePhoto(pool, "sandbox", row.photos[0].id)).toBeUndefined();
  });
  it("never leaves a partial request or notification when image validation fails", async () => {
    const bad = new File(["invalid pixels"], "image.jpg", { type: "image/jpeg" });
    await expect(submitRequest(pool, "sandbox", input(), "192.0.2.1", secret, now, { photos: [bad] })).rejects.toMatchObject({ status: 400 });
    expect((await requestQueue(pool, "sandbox")).total).toBe(0);
    expect((await pool.query("SELECT count(*) FROM customs.notifications")).rows[0].count).toBe("0");
    expect((await pool.query("SELECT count(*) FROM customs.reference_photos")).rows[0].count).toBe("0");
  });
  it("requires contact information, an idea, and the acknowledgement", async () => {
    for (const data of [input({ email: "" }), input({ email: "bad" }), input({ whatnotUsername: "https://whatnot.com/user" }), input({ acknowledged: false }), input({ request: "" })])
      await expect(submit(data)).rejects.toThrow();
    expect((await requestQueue(pool, "sandbox")).total).toBe(0);
  });
  it("rejects missing, impossible and past dates, and clears stale date fields when unchecked", async () => {
    for (const neededBy of ["", "2026-02-30", "2026-10-23"])
      await expect(submit(input({ hasDeadline: true, neededBy }))).rejects.toThrow();
    await submit(input({ hasDeadline: true, neededBy: "2026-10-24" }));
    await submit(input({ neededBy: "2026-11-01", occasion: "Stale birthday field" }));
    const rows = (await requestQueue(pool, "sandbox")).rows;
    expect(rows[0].needed_by).toBe("2026-10-24");
    expect(rows[1]).toMatchObject({ needed_by: null, occasion: "" });
    expect(shopToday(new Date("2026-10-25T01:00:00Z"))).toBe("2026-10-24");
  });
  it("makes concurrent retries idempotent without overwriting the original request", async () => {
    const data = input();
    const ids = await Promise.all([submit(data), submit(data), submit(data)]);
    expect(new Set(ids).size).toBe(1);
    await submit({ ...data, request: "An altered retry must not replace the first submission." });
    expect((await requestQueue(pool, "sandbox")).rows[0].request).toBe(data.request);
    await migrate(pool);
    expect((await requestQueue(pool, "sandbox")).total).toBe(1);
  });
  it("keeps sandbox and live requests isolated", async () => {
    const data = input();
    const sandboxId = await submit(data);
    await submitRequest(pool, "live", data, "192.0.2.1", secret, now);
    expect((await requestQueue(pool, "live")).total).toBe(1);
    await expect(updateRequest(pool, "live", { id: sandboxId, revision: 1, status: "completed", staffNotes: "test" }, "staff_fixture")).rejects.toMatchObject({ status: 409 });
    expect((await requestQueue(pool, "sandbox")).rows[0].status).toBe("new");
  });
  it("saves status and staff notes and rejects stale concurrent edits", async () => {
    const id = await submit();
    const update = { id, revision: 1, status: "reviewing", staffNotes: "Contacted through Whatnot." };
    await updateRequest(pool, "sandbox", update, "staff_fixture");
    await expect(updateRequest(pool, "sandbox", { ...update, status: "declined" }, "other_staff")).rejects.toMatchObject({ status: 409 });
    expect((await requestQueue(pool, "sandbox")).rows[0]).toMatchObject({ status: "reviewing", staff_notes: update.staffNotes, revision: 2 });
    await updateRequest(pool, "sandbox", { ...update, revision: 2, status: "completed" }, "staff_fixture");
    expect((await requestQueue(pool, "sandbox")).total).toBe(0);
    expect((await requestQueue(pool, "sandbox", "closed")).rows[0].status).toBe("completed");
    expect((await requestQueue(pool, "sandbox", "all")).total).toBe(1);
  });
  it("keeps received order regardless of requested dates and paginates without losing requests", async () => {
    await submit(input({ hasDeadline: true, neededBy: "2026-12-10" }));
    await submit(input({ hasDeadline: true, neededBy: "2026-11-10" }));
    for (let i = 0; i < 51; i++) await submit(input(), `192.0.2.${i + 10}`);
    const first = await requestQueue(pool, "sandbox");
    const second = await requestQueue(pool, "sandbox", "open", 2);
    expect(first.rows.map((r) => r.needed_by).slice(0, 2)).toEqual(["2026-12-10", "2026-11-10"]);
    expect(first.rows).toHaveLength(50);
    expect(second.rows).toHaveLength(3);
    expect(new Set([...first.rows, ...second.rows].map((r) => r.id)).size).toBe(53);
  });
  it("discards the honeypot and fails closed without abuse protection", async () => {
    expect(await submit(input({ website: "spam" }))).toBeNull();
    await expect(submitRequest(pool, "sandbox", input(), "192.0.2.1", "", now)).rejects.toMatchObject({ status: 503 });
    expect((await requestQueue(pool, "sandbox")).total).toBe(0);
  });
  it("enforces the rate limit across simultaneous requests and stores no raw IP", async () => {
    const results = await Promise.allSettled(Array.from({ length: 9 }, () => submit()));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect((await requestQueue(pool, "sandbox")).total).toBe(5);
    expect(JSON.stringify((await pool.query("SELECT * FROM customs.rate_limits")).rows)).not.toContain("192.0.2.1");
    await submitRequest(pool, "sandbox", input(), "192.0.2.1", secret, new Date("2026-10-24T13:00:00Z"));
  });
  it("rejects oversized bodies and fields", async () => {
    await expect(readRequestBody(new Request("https://example.invalid", { method: "POST", body: "x".repeat(32769) }))).rejects.toMatchObject({ status: 413 });
    await expect(submit(input({ details: "x".repeat(4001) }))).rejects.toThrow();
  });
});
