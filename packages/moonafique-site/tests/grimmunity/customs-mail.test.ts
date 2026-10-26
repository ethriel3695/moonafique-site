import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { migrate } from "../../lib/grimmunity/migrations";
import { submitRequest } from "../../lib/customs/store";
import { deliverCustomEmails } from "../../lib/customs/mail";

const notifications = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: notifications.send }; } }));
const url = new URL(process.env.GRIM_TEST_DATABASE_URL ?? "http://invalid");
if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/grim_test") throw new Error("Use a disposable local grim_test database.");
const pool = new Pool({ connectionString: url.toString(), max: 10 });
const secret = "fixture-custom-request-secret-at-least-32-characters";
const input = (overrides = {}) => ({ submissionKey: randomUUID(), name: "Test visitor", email: "visitor@example.invalid", request: "A keepsake with a purple butterfly.", hasDeadline: true, neededBy: "2026-11-20", acknowledged: true, ...overrides });
const submit = (data: unknown = input()) => submitRequest(pool, "live", data, "192.0.2.1", secret, new Date("2026-10-24T12:00:00Z"));
beforeAll(() => migrate(pool));
beforeEach(async () => {
  await pool.query("TRUNCATE customs.requests,customs.rate_limits CASCADE");
  notifications.send.mockReset().mockResolvedValue({ data: { id: "email_fixture" }, error: null });
  vi.stubEnv("CUSTOM_REQUEST_SEND_EMAILS", "approved");
  vi.stubEnv("CUSTOM_REQUEST_STAFF_EMAIL", "hello@example.invalid");
  vi.stubEnv("CUSTOM_REQUEST_TEST_EMAIL", "test-inbox@example.invalid");
  vi.stubEnv("RESEND_API_KEY", "re_fixture");
  vi.stubEnv("RESEND_FROM_EMAIL", "Moonafique <sender@example.invalid>");
  vi.stubEnv("GRIM_SITE_URL", "https://example.invalid");
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => pool.end());

describe("custom request notifications", () => {
  it("sends one staff email and one customer receipt with the received-order policy", async () => {
    const id = await submit();
    expect(await deliverCustomEmails(pool, "live", { requestId: id! })).toEqual({ sent: 2, failures: 0 });
    const payloads = notifications.send.mock.calls.map(([payload]) => payload);
    const staff = payloads.find((p) => p.to === "hello@example.invalid");
    const customer = payloads.find((p) => p.to === "visitor@example.invalid");
    expect(staff.replyTo).toBe("visitor@example.invalid");
    expect(staff.text).toContain("A keepsake with a purple butterfly.");
    expect(staff.html).toContain("https://example.invalid/admin/customs");
    expect(customer.replyTo).toBe("hello@moonafique.com");
    expect(customer.text).toContain("order they’re received");
    expect(customer.text).toContain("for our information only");
    expect(customer.text).toContain("not a promise or agreement to complete or deliver");
    expect(customer.text).not.toContain("A keepsake with a purple butterfly.");
    expect((await pool.query("SELECT state FROM customs.notifications")).rows.every((r) => r.state === "sent")).toBe(true);
  });
  it("schedules only a staff email for a Whatnot-only request", async () => {
    await submit(input({ email: "", whatnotUsername: "@fixture_handle" }));
    await deliverCustomEmails(pool, "live");
    expect(notifications.send).toHaveBeenCalledTimes(1);
    expect(notifications.send.mock.calls[0][0]).toMatchObject({ to: "hello@example.invalid", subject: "New custom request for Moonafique" });
    expect(notifications.send.mock.calls[0][0].text).toContain("@fixture_handle");
  });
  it("deduplicates request retries and concurrent delivery workers", async () => {
    const data = input();
    await Promise.all([submit(data), submit(data)]);
    await Promise.all([deliverCustomEmails(pool, "live"), deliverCustomEmails(pool, "live")]);
    await deliverCustomEmails(pool, "live");
    expect(notifications.send).toHaveBeenCalledTimes(2);
    expect(new Set(notifications.send.mock.calls.map(([, options]) => options.idempotencyKey)).size).toBe(2);
  });
  it("keeps a saved request and retries the identical payload after an ambiguous failure", async () => {
    await submit(input({ email: "", whatnotUsername: "fixture" }));
    notifications.send.mockRejectedValueOnce(new Error("Connection interrupted"));
    expect(await deliverCustomEmails(pool, "live")).toEqual({ sent: 0, failures: 1 });
    expect((await pool.query("SELECT count(*) FROM customs.requests")).rows[0].count).toBe("1");
    vi.stubEnv("CUSTOM_REQUEST_STAFF_EMAIL", "changed@example.invalid");
    vi.stubEnv("RESEND_FROM_EMAIL", "Changed <changed@example.invalid>");
    expect(await deliverCustomEmails(pool, "live")).toEqual({ sent: 1, failures: 0 });
    expect(notifications.send.mock.calls[0]).toEqual(notifications.send.mock.calls[1]);
  });
  it("holds old ambiguous sends for staff review instead of risking duplicates", async () => {
    await submit(input({ email: "", whatnotUsername: "fixture" }));
    notifications.send.mockRejectedValueOnce(new Error("Unknown delivery"));
    await deliverCustomEmails(pool, "live");
    await pool.query("UPDATE customs.notifications SET first_attempt_at=now()-interval '25 hours'");
    await deliverCustomEmails(pool, "live");
    expect(notifications.send).toHaveBeenCalledTimes(1);
    expect((await pool.query("SELECT state FROM customs.notifications")).rows[0].state).toBe("review");
  });
  it("routes both sandbox emails only to the configured sink and respects the delivery gate", async () => {
    await submitRequest(pool, "sandbox", input(), "192.0.2.1", secret, new Date("2026-10-24T12:00:00Z"));
    vi.stubEnv("CUSTOM_REQUEST_SEND_EMAILS", "disabled");
    expect(await deliverCustomEmails(pool, "sandbox")).toMatchObject({ skipped: "disabled" });
    vi.stubEnv("CUSTOM_REQUEST_SEND_EMAILS", "approved");
    vi.stubEnv("CUSTOM_REQUEST_TEST_EMAIL", "");
    await expect(deliverCustomEmails(pool, "sandbox")).rejects.toThrow();
    expect(notifications.send).not.toHaveBeenCalled();
    vi.stubEnv("CUSTOM_REQUEST_TEST_EMAIL", "test-inbox@example.invalid");
    await deliverCustomEmails(pool, "sandbox");
    expect(notifications.send).toHaveBeenCalledTimes(2);
    for (const [payload] of notifications.send.mock.calls) {
      expect(payload.to).toBe("test-inbox@example.invalid");
      expect(payload.subject).toMatch(/^\[TEST\]/);
    }
  });
  it("does not backfill historical requests or create emails from a discarded bot submission", async () => {
    const data = input({ email: "", whatnotUsername: "fixture" });
    await pool.query("INSERT INTO customs.requests(mode,submission_key,name,whatnot_username,request,acknowledgement_version) VALUES('live',$1,$2,$3,$4,'custom-request-v1')", [data.submissionKey, data.name, "fixture", data.request]);
    await migrate(pool);
    await submit(data);
    await submit(input({ website: "bot" }));
    await deliverCustomEmails(pool, "live");
    expect(notifications.send).not.toHaveBeenCalled();
  });
  it("escapes submitted text in staff HTML and does not forward arbitrary text in customer receipts", async () => {
    await submit(input({ name: "<img src=x onerror=alert(1)>", request: "<script>malicious()</script> Visit attacker.invalid" }));
    await deliverCustomEmails(pool, "live");
    const staff = notifications.send.mock.calls.find(([p]) => p.to === "hello@example.invalid")![0];
    const customer = notifications.send.mock.calls.find(([p]) => p.to === "visitor@example.invalid")![0];
    expect(staff.html).toContain("&lt;script&gt;");
    expect(staff.html).not.toContain("<script>");
    expect(customer.text).not.toContain("attacker.invalid");
  });
  it("labels staff-triggered samples as tests and keeps them out of the open queue", async () => {
    const id = await submitRequest(pool, "live", input({ email: "hello@example.invalid" }), "staff-fixture", secret, new Date("2026-10-24T12:00:00Z"), { staffEmailTest: true });
    await deliverCustomEmails(pool, "live", { requestId: id! });
    expect((await pool.query("SELECT status FROM customs.requests WHERE id=$1", [id])).rows[0].status).toBe("completed");
    for (const [payload] of notifications.send.mock.calls) expect(payload.subject).toMatch(/^\[TEST\]/);
  });
});
