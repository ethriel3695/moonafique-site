import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { snapshot } from "./fixtures";
const state = vi.hoisted(() => ({ user: null as null | { id: string; email: string }, database: vi.fn(), read: vi.fn(), start: vi.fn(), poll: vi.fn() }));
vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: async () => ({ user: state.user }) }));
vi.mock("@/lib/grimmunity/db", () => ({ database: state.database }));
vi.mock("@/lib/whatnot-analytics/store", () => ({ readAnalytics: state.read, startRefresh: state.start, collectRefresh: state.poll, publicRefresh: (value: unknown) => value }));
vi.mock("next/navigation", () => ({ notFound: () => { throw Error("NOT_FOUND"); } }));
import { POST } from "../../app/admin/whatnot/refresh/route";
import { GET } from "../../app/admin/whatnot/export/route";
import Page from "../../app/admin/whatnot/page";
const request = (body = '{"action":"start"}', origin = "https://example.invalid") => new Request("https://example.invalid/admin/whatnot/refresh", { method: "POST", headers: { origin }, body });
beforeEach(() => {
  vi.clearAllMocks(); state.user = null;
  vi.stubEnv("GRIM_SITE_URL", "https://example.invalid"); vi.stubEnv("GRIM_STAFF_USER_IDS", "staff"); vi.stubEnv("WHATNOT_ANALYTICS_API_TOKEN", "test-token");
  state.read.mockResolvedValue({ snapshot: snapshot(), refresh: null });
  state.start.mockResolvedValue({ id: "fixture", status: "pending" });
});
afterEach(() => vi.unstubAllEnvs());
it("rejects anonymous and ordinary members before touching reports or storage", async () => {
  for (const user of [null, { id: "member", email: "member@example.invalid" }]) {
    state.user = user;
    expect((await POST(request())).status).toBe(user ? 403 : 401);
    expect((await GET(new Request("https://example.invalid/admin/whatnot/export?kind=ledger"))).status).toBe(user ? 403 : 401);
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  }
  expect(state.database).not.toHaveBeenCalled(); expect(state.read).not.toHaveBeenCalled(); expect(state.start).not.toHaveBeenCalled();
});
it("requires an exact staff ID and same-origin refresh, validates JSON before storage", async () => {
  state.user = { id: "staff", email: "staff@example.invalid" };
  expect((await POST(request(undefined, "https://evil.invalid"))).status).toBe(403);
  expect((await POST(request("bad JSON"))).status).toBe(400);
  expect((await POST(request('{"action":"poll","id":"bad"}'))).status).toBe(400);
  expect(state.database).not.toHaveBeenCalled();
  expect((await POST(request())).status).toBe(200); expect(state.start).toHaveBeenCalledTimes(1);
});
it("returns private staff CSV attachments without provider URLs or secret configuration", async () => {
  state.user = { id: "staff", email: "staff@example.invalid" };
  const response = await GET(new Request("https://example.invalid/admin/whatnot/export?kind=ledger&range=all"));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("private, no-store");
  expect(response.headers.get("x-robots-tag")).toContain("noindex");
  expect(response.headers.get("content-disposition")).toContain("attachment;");
  const body = await response.text(); expect(body).toContain("ledger-1"); expect(body).not.toContain("test-token"); expect(body).not.toContain("amazonaws");
});
it("sanitizes storage failures and never reports them as successful exports", async () => {
  state.user = { id: "staff", email: "staff@example.invalid" };
  state.read.mockRejectedValueOnce(Error("private-database-secret"));
  const response = await GET(new Request("https://example.invalid/admin/whatnot/export?kind=ledger"));
  expect(response.status).toBe(503); expect(await response.text()).not.toContain("private-database-secret");
});
