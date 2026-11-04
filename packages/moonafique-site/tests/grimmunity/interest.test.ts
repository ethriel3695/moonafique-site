import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { migrate } from "../../lib/grimmunity/migrations";
import { confirmEmail, interestConsentVersion, interestCSV, readInterestBody, registerInterest } from "../../lib/grimmunity/interest";
import { deliverInterestConfirmations } from "../../lib/grimmunity/interest-mail";
import { POST as startNewsletter } from "@/app/api/subscribe/route";
import { POST as confirmFromLink } from "@/app/api/confirm-email/route";
import { guardProviderRequest } from "../../lib/grimmunity/provider-request-guard";

const notifications = vi.hoisted(() => ({ send: vi.fn(), activate: vi.fn(), after: [] as (() => Promise<void>)[] }));
vi.mock("resend", () => ({ Resend: class { emails = { send: notifications.send }; } }));
vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: async () => ({ user: null }) }));
vi.mock("next/server", { spy: true });
vi.mock("@/lib/grimmunity/db", async (original) => ({ ...await original<typeof import("@/lib/grimmunity/db")>(), database: () => pool }));
vi.mock("@/lib/newsletter", () => ({ activateNewsletter: notifications.activate }));
import { after } from "next/server";

const url = new URL(process.env.GRIM_TEST_DATABASE_URL ?? "http://invalid");
if (!["127.0.0.1", "localhost"].includes(url.hostname) || url.pathname !== "/grim_test")
  throw new Error("Use a disposable local grim_test database.");
const pool = new Pool({ connectionString: url.toString(), max: 10 });
const secret = "fixture-interest-secret-at-least-32-characters";
const input = { email: "collector@example.invalid", consent: true };
const now = new Date();
const submit = (data: unknown = input, ip = "192.0.2.1", at = now) => registerInterest(pool, "live", data, ip, secret, at);
beforeAll(() => migrate(pool));
beforeEach(async () => {
  await pool.query("TRUNCATE grim.interest,grim.interest_rate_limits CASCADE");
  notifications.send.mockReset().mockResolvedValue({ data: { id: "email_confirmation_fixture" }, error: null });
  notifications.activate.mockReset().mockResolvedValue(undefined);
  notifications.after.length = 0;
  vi.mocked(after).mockImplementation((task) => {
    if (typeof task === "function") notifications.after.push(async () => { await task(); });
  });
  vi.stubEnv("GRIM_SEND_INTEREST_EMAILS", "approved");
  vi.stubEnv("GRIM_SEND_EMAILS", "disabled");
  vi.stubEnv("GRIM_TEST_EMAIL", "verified-owner@example.invalid");
  vi.stubEnv("RESEND_API_KEY", "re_fixture");
  vi.stubEnv("RESEND_FROM_EMAIL", "Moonafique <sender@example.invalid>");
  vi.stubEnv("GRIM_INTEREST_SECRET", secret);
  vi.stubEnv("GRIM_SITE_URL", "http://localhost:3000");
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
    expect(rows[0]).toEqual({ mode: "live", email: input.email, consent_version: interestConsentVersion });
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
    const rates = (await pool.query("SELECT * FROM grim.interest_rate_limits")).rows;
    expect(rates.map((r) => r.attempts)).toContain(9);
    expect(JSON.stringify(rates)).not.toContain("192.0.2.1");
    await submit(input, "192.0.2.1", new Date(now.getTime() + 3_600_000));
  });
  it("limits email requests even when the submitters rotate IPs", async () => {
    const result = await Promise.allSettled(Array.from({ length: 125 }, (_, i) =>
      submit({ ...input, email: `rotating${i}@example.invalid` }, `192.0.2.${i + 1}`),
    ));
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(120);
    expect((await pool.query("SELECT * FROM grim.interest_notifications")).rowCount).toBe(120);
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
    expect(notifications.send.mock.calls[0][0]).toMatchObject({ to: "verified-owner@example.invalid", subject: "[TEST] Confirm your Moonafique membership launch list signup" });
    expect((await pool.query("SELECT n.state FROM grim.interest_notifications n JOIN grim.interest i ON i.id=n.interest_id WHERE i.mode='live'")).rows[0].state).toBe("pending");
  });
  it("does not backfill old contacts or send after a contact is removed", async () => {
    await pool.query("INSERT INTO grim.interest(mode,email,consent_version) VALUES('live',$1,'grimmunity-launch-notice-v1')", [input.email]);
    await migrate(pool);
    await deliverInterestConfirmations(pool, "live");
    expect(notifications.send).not.toHaveBeenCalled();
    const id = await submit({ ...input, email: "removed@example.invalid" });
    await pool.query("DELETE FROM grim.interest WHERE id=$1", [id]);
    await deliverInterestConfirmations(pool, "live");
    expect(notifications.send).not.toHaveBeenCalled();
    expect((await pool.query("SELECT * FROM grim.interest_notifications")).rowCount).toBe(0);
  });
  it("keeps the address pending until a valid link is confirmed and does not subscribe it to the newsletter", async () => {
    await submit();
    expect((await pool.query("SELECT * FROM grim.interest WHERE confirmed_at IS NOT NULL")).rowCount).toBe(0);
    await deliverInterestConfirmations(pool, "live");
    const token = notifications.send.mock.calls[0][0].text.match(/confirm-email#(\S+)/)[1];
    const activate = vi.fn();
    const forged = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    await expect(confirmEmail(pool, "live", forged, secret, activate)).rejects.toMatchObject({ status: 400 });
    await expect(confirmEmail(pool, "sandbox", token, secret, activate)).rejects.toMatchObject({ status: 400 });
    await expect(confirmEmail(pool, "live", token, secret, activate, new Date(now.getTime() + 86_400_000))).rejects.toMatchObject({ status: 400 });
    await expect(confirmEmail(pool, "live", token, secret, activate)).resolves.toBe("launch");
    expect(activate).not.toHaveBeenCalled();
    expect((await pool.query("SELECT * FROM grim.interest WHERE confirmed_at IS NOT NULL")).rowCount).toBe(1);
  });
  it("keeps newsletter consent separate and activates it once after confirmation", async () => {
    await submit();
    const id = await registerInterest(pool, "live", input, "192.0.2.1", secret, now, "newsletter");
    await deliverInterestConfirmations(pool, "live", { interestId: id });
    expect(notifications.send).not.toHaveBeenCalled();
    vi.stubEnv("NEWSLETTER_SEND_EMAILS", "approved");
    await deliverInterestConfirmations(pool, "live", { interestId: id });
    const token = notifications.send.mock.calls[0][0].text.match(/confirm-email#(\S+)/)[1];
    const activate = vi.fn().mockResolvedValue(undefined);
    expect(await Promise.all([confirmEmail(pool, "live", token, secret, activate), confirmEmail(pool, "live", token, secret, activate)])).toEqual(["newsletter", "newsletter"]);
    expect(activate).toHaveBeenCalledExactlyOnceWith(input.email);
    expect((await pool.query("SELECT purpose FROM grim.interest WHERE confirmed_at IS NOT NULL")).rows).toEqual([{ purpose: "newsletter" }]);
  });
  it("requires a same-site confirmation POST before sending a newsletter contact to the provider", async () => {
    vi.stubEnv("GRIM_MODE", "live");
    vi.stubEnv("NEWSLETTER_SEND_EMAILS", "approved");
    vi.stubEnv("RESEND_NEWSLETTER_SEGMENT_ID", "segment_fixture");
    const request = (path: string, body: unknown, origin = "http://localhost:3000") => new Request(`http://localhost:3000${path}`, {
      method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    expect((await startNewsletter(request("/api/subscribe", input, "https://other.example.invalid"))).status).toBe(403);
    expect((await startNewsletter(request("/api/subscribe", { email: input.email }))).status).toBe(400);
    expect((await startNewsletter(request("/api/subscribe", input))).status).toBe(200);
    expect(notifications.activate).not.toHaveBeenCalled();
    await Promise.all(notifications.after.map((task) => task()));
    expect(notifications.send).toHaveBeenCalledTimes(1);
    const token = notifications.send.mock.calls[0][0].text.match(/confirm-email#(\S+)/)[1];
    expect((await confirmFromLink(request("/api/confirm-email", { token }, "https://other.example.invalid"))).status).toBe(403);
    expect(notifications.activate).not.toHaveBeenCalled();
    expect((await confirmFromLink(request("/api/confirm-email", { token }))).status).toBe(200);
    expect(notifications.activate).toHaveBeenCalledExactlyOnceWith(input.email);
  });
  it("limits repeated membership checkout per account across concurrent connections", async () => {
    const request = new Request("http://localhost:3000/api/grimmunity/checkout", { headers: { "x-forwarded-for": "192.0.2.9" } });
    const results = await Promise.allSettled(Array.from({ length: 12 }, () => guardProviderRequest(request, "membership", "fixture_owner")));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(8);
    const rejects = results.filter((result) => result.status === "rejected");
    expect(rejects).toHaveLength(4);
    expect(rejects.every(({ reason }) => reason.status === 429)).toBe(true);
  });
});
