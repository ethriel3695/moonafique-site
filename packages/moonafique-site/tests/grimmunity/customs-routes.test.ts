import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: null as null | { id: string; email: string }, submit: vi.fn(), update: vi.fn(), deliver: vi.fn(), after: vi.fn() }));
vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: async () => ({ user: state.user }) }));
vi.mock("@/lib/grimmunity/db", () => ({ database: () => ({}) }));
vi.mock("@/lib/grimmunity/runtime", () => ({ grimMode: () => "sandbox" }));
vi.mock("@/lib/customs/store", () => ({ submitRequest: state.submit, updateRequest: state.update }));
vi.mock("@/lib/customs/mail", () => ({ deliverCustomEmails: state.deliver }));
vi.mock("next/server", async (original) => ({ ...await original<typeof import("next/server")>(), after: state.after }));
import { POST } from "@/app/api/custom-requests/route";
import { PATCH } from "@/app/api/custom-requests/manage/route";
import { POST as retry, GET as cron } from "@/app/api/custom-requests/notifications/route";
const request = (method = "POST", origin = "https://example.invalid", body = "{}") => new Request("https://example.invalid/api/custom-requests", { method, headers: { origin }, body });
beforeEach(() => {
  vi.clearAllMocks(); state.user = null;
  vi.stubEnv("GRIM_SITE_URL", "https://example.invalid");
  vi.stubEnv("GRIM_STAFF_USER_IDS", "user_staff");
  state.submit.mockResolvedValue("request_fixture");
  state.update.mockResolvedValue({ ok: true });
  state.deliver.mockResolvedValue({ sent: 1, failures: 0 });
});
afterEach(() => vi.unstubAllEnvs());
describe("custom request authorization", () => {
  it("lets visitors submit without an account and returns no customer details", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, reference: "request_fixture" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(state.after).toHaveBeenCalledTimes(1);
  });
  it("requires staff auth for queue changes", async () => {
    expect((await PATCH(request("PATCH"))).status).toBe(401);
    expect((await retry(request())).status).toBe(401);
    state.user = { id: "ordinary_customer", email: "customer@example.invalid" };
    expect((await PATCH(request("PATCH"))).status).toBe(403);
    expect((await retry(request())).status).toBe(403);
    expect(state.update).not.toHaveBeenCalled();
    state.user = { id: "user_staff", email: "staff@example.invalid" };
    expect((await PATCH(request("PATCH"))).status).toBe(200);
    expect(state.update).toHaveBeenCalledWith({}, "sandbox", {}, "user_staff");
  });
  it("protects the scheduled email retry and can run without billing", async () => {
    vi.stubEnv("CRON_SECRET", "custom-email-cron-secret-at-least-32-characters");
    expect((await cron(new Request("https://example.invalid"))).status).toBe(401);
    expect((await cron(new Request("https://example.invalid", { headers: { authorization: "Bearer custom-email-cron-secret-at-least-32-characters" } }))).status).toBe(200);
    expect(state.deliver).toHaveBeenCalled();
  });
  it("does not schedule email after a failed save or discarded bot submission", async () => {
    state.submit.mockResolvedValueOnce(null);
    expect((await POST(request())).status).toBe(200);
    state.submit.mockRejectedValueOnce(new Error("storage unavailable"));
    expect((await POST(request())).status).toBe(503);
    expect(state.after).not.toHaveBeenCalled();
  });
  it("restricts sample emails to staff and the configured inbox", async () => {
    vi.stubEnv("CUSTOM_REQUEST_SEND_EMAILS", "approved");
    vi.stubEnv("CUSTOM_REQUEST_STAFF_EMAIL", "hello@example.invalid");
    const body = JSON.stringify({ action: "test", submissionKey: "11111111-1111-4111-8111-111111111111", email: "ignored@example.invalid" });
    expect((await retry(request("POST", "https://example.invalid", body))).status).toBe(401);
    state.user = { id: "user_staff", email: "staff@example.invalid" };
    expect((await retry(request("POST", "https://example.invalid", body))).status).toBe(200);
    expect(state.submit.mock.calls[0][2].email).toBe("hello@example.invalid");
    expect(state.submit.mock.calls[0][6]).toEqual({ staffEmailTest: true });
  });
  it("rejects cross-origin writes even for staff", async () => {
    state.user = { id: "user_staff", email: "staff@example.invalid" };
    expect((await POST(request("POST", "https://evil.invalid"))).status).toBe(403);
    expect((await PATCH(request("PATCH", "https://evil.invalid"))).status).toBe(403);
    expect(state.submit).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
  });
  it("does not leak database errors or claim a failed save succeeded", async () => {
    state.submit.mockRejectedValueOnce(new Error("secret database connection details"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
    expect((await POST(request("POST", "https://example.invalid", "broken JSON"))).status).toBe(400);
  });
});
