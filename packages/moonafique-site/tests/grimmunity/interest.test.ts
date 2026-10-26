import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { migrate } from "../../lib/grimmunity/migrations";
import { interestCSV, readInterestBody, registerInterest } from "../../lib/grimmunity/interest";
import { deliverInterestConfirmations } from "../../lib/grimmunity/interest-mail";

const notifications = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: notifications.send }; } }));

const url = new URL(process.env.GRIM_TEST_DATABASE_URL ?? "http://invalid");
if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/grim_test")
  throw new Error("Use a disposable local grim_test database.");
const pool = new Pool({ connectionString: url.toString(), max: 10 });
const secret = "fixture-interest-secret-at-least-32-characters";
const input = { email: "collector@example.invalid", consent: true };
const now = new Date("2026-10-24T12:15:00Z");
const submit = (data: unknown = input, ip = "192.0.2.1", at = now) => registerInterest(pool, "live", data, ip, secret, at);
beforeAll(() => migrate(pool));
beforeEach(async () => {
  await pool.query("TRUNCATE grim.interest,grim.interest_rate_limits CASCADE");
  notifications.send.mockReset().mockResolvedValue({ data: { id: "email_confirmation_fixture" }, error: null });
  vi.stubEnv("GRIM_SEND_INTEREST_EMAILS", "approved");
  vi.stubEnv("GRIM_SEND_EMAILS", "disabled");
  vi.stubEnv("GRIM_TEST_EMAIL", "verified-owner@example.invalid");
  vi.stubEnv("RESEND_API_KEY", "re_fixture");
  vi.stubEnv("RESEND_FROM_EMAIL", "Moonafique <sender@example.invalid>");
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => pool.end());

describe("launch interest list", () => {
  it("deduplicates normalized emails and keeps sandbox records separate", async () => {
    await submit({ ...input, email: " Collector@Example.invalid " });
    await submit();
    await registerInterest(pool, "sandbox", input, "192.0.2.1", secret, now);
    const rows = (await pool.query("SELECT mode,email,consent_version FROM grim.interest ORDER BY mode")).rows;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ mode: "live", email: input.email, consent_version: "grimmunity-confirmation-and-launch-v2" });
  });
  it("requires consent and a valid email", async () => {
    await expect(submit({ ...input, consent: false })).rejects.toThrow();
    await expect(submit({ ...input, email: "invalid" })).rejects.toThrow();
    expect((await pool.query("SELECT * FROM grim.interest")).rowCount).toBe(0);
  });
  it("discards the bot field without creating a contact", async () => {
    await submit({ ...input, website: "spam" });
    expect((await pool.query("SELECT * FROM grim.interest")).rowCount).toBe(0);
  });
  it("limits concurrent submissions across connections without storing raw IPs", async () => {
    const result = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => submit({ ...input, email: `collector${i}@example.invalid` })));
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(8);
    expect((await pool.query("SELECT * FROM grim.interest")).rowCount).toBe(8);
    const rate = (await pool.query("SELECT * FROM grim.interest_rate_limits")).rows[0];
    expect(rate.attempts).toBe(9);
    expect(JSON.stringify(rate)).not.toContain("192.0.2.1");
    await submit(input, "192.0.2.1", new Date("2026-10-24T13:00:00Z"));
  });
  it("fails closed without a rate-limit secret", async () => {
    await expect(registerInterest(pool, "live", input, "192.0.2.1", "", now)).rejects.toMatchObject({ code: "interest_unavailable" });
  });
  it("rejects oversized bodies even without a content-length header", async () => {
    await expect(readInterestBody(new Request("https://example.invalid", { method: "POST", body: "x".repeat(4097) }))).rejects.toMatchObject({ status: 413 });
  });
  it("protects CSV cells from spreadsheet formula execution", () => {
    expect(interestCSV([{ email: "=formula@example.invalid", created_at: now, consent_version: "v1" }])).toContain('"\'=formula@example.invalid"');
  });
  it("sends one confirmation across concurrent normalized signups and delivery workers", async () => {
    const ids = await Promise.all([submit(), submit({ ...input, email: " COLLECTOR@EXAMPLE.INVALID " })]);
    expect(new Set(ids).size).toBe(1);
    await Promise.all(ids.map((interestId) => deliverInterestConfirmations(pool, "live", { interestId })));
    await deliverInterestConfirmations(pool, "live");
    expect(notifications.send).toHaveBeenCalledTimes(1);
    const [message, options] = notifications.send.mock.calls[0];
    expect(message.to).toBe(input.email);
    expect(message.subject).not.toContain("[TEST]");
    expect(message.text).toContain("doesn’t reserve a membership");
    expect(options.idempotencyKey).toMatch(/^grim-interest\//);
    expect((await pool.query("SELECT state FROM grim.interest_notifications")).rows[0].state).toBe("sent");
  });
  it("keeps the signup after an ambiguous provider failure and retries the identical request", async () => {
    const interestId = await submit();
    notifications.send.mockRejectedValueOnce(new Error("Connection interrupted after send"));
    expect(await deliverInterestConfirmations(pool, "live", { interestId })).toMatchObject({ sent: 0, failures: 1 });
    expect((await pool.query("SELECT * FROM grim.interest")).rowCount).toBe(1);
    vi.stubEnv("RESEND_FROM_EMAIL", "Changed <other@example.invalid>");
    expect(await deliverInterestConfirmations(pool, "live", { interestId })).toMatchObject({ sent: 1 });
    expect(notifications.send.mock.calls[0]).toEqual(notifications.send.mock.calls[1]);
  });
  it("holds ambiguous attempts after the provider deduplication window", async () => {
    await submit();
    notifications.send.mockRejectedValueOnce(new Error("Unknown delivery"));
    await deliverInterestConfirmations(pool, "live");
    await pool.query("UPDATE grim.interest_notifications SET first_attempt_at=now()-interval '25 hours'");
    await deliverInterestConfirmations(pool, "live");
    expect(notifications.send).toHaveBeenCalledTimes(1);
    expect((await pool.query("SELECT state FROM grim.interest_notifications")).rows[0].state).toBe("review");
  });
  it("uses the separate delivery gate and sends sandbox messages only to the approved sink", async () => {
    await submit();
    const interestId = await registerInterest(pool, "sandbox", input, "192.0.2.1", secret, now);
    vi.stubEnv("GRIM_SEND_INTEREST_EMAILS", "disabled");
    expect(await deliverInterestConfirmations(pool, "live")).toMatchObject({ skipped: "disabled" });
    vi.stubEnv("GRIM_SEND_INTEREST_EMAILS", "approved");
    vi.stubEnv("GRIM_TEST_EMAIL", "");
    await expect(deliverInterestConfirmations(pool, "sandbox")).rejects.toMatchObject({ code: "test_email_required" });
    vi.stubEnv("GRIM_TEST_EMAIL", "verified-owner@example.invalid");
    await deliverInterestConfirmations(pool, "sandbox", { interestId });
    expect(notifications.send).toHaveBeenCalledTimes(1);
    expect(notifications.send.mock.calls[0][0]).toMatchObject({ to: "verified-owner@example.invalid", subject: "[TEST] You’re on the Grimmunity waiting list!" });
    expect((await pool.query("SELECT n.state FROM grim.interest_notifications n JOIN grim.interest i ON i.id=n.interest_id WHERE i.mode='live'")).rows[0].state).toBe("pending");
  });
  it("does not backfill old contacts or send after a contact is removed", async () => {
    await pool.query("INSERT INTO grim.interest(mode,email,consent_version) VALUES('live',$1,'grimmunity-launch-notice-v1')", [input.email]);
    await migrate(pool);
    await submit();
    await deliverInterestConfirmations(pool, "live");
    expect(notifications.send).not.toHaveBeenCalled();
    const id = await submit({ ...input, email: "removed@example.invalid" });
    await pool.query("DELETE FROM grim.interest WHERE id=$1", [id]);
    await deliverInterestConfirmations(pool, "live");
    expect(notifications.send).not.toHaveBeenCalled();
    expect((await pool.query("SELECT * FROM grim.interest_notifications")).rowCount).toBe(0);
  });
});
