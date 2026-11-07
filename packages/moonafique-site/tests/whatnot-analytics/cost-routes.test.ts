import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: null as null | { id: string }, db: vi.fn(), read: vi.fn(), save: vi.fn(), refs: vi.fn() }));
vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: async () => ({ user: state.user }) }));
vi.mock("@/lib/grimmunity/db", () => ({ database: state.db }));
vi.mock("@/lib/whatnot-analytics/cost-store", async original => ({ ...await original<object>(), readCosts: state.read, saveCostJob: state.save, saveReferences: state.refs }));
vi.mock("next/navigation", () => ({ notFound: () => { throw Error("NOT_FOUND"); } }));
import { GET, POST } from "../../app/admin/whatnot/costs/data/route";
import Page from "../../app/admin/whatnot/costs/page";
const url = "https://example.invalid/admin/whatnot/costs/data";
const request = (body: string, origin = "https://example.invalid") => new Request(url, { method: "POST", headers: { origin }, body });
beforeEach(() => { vi.clearAllMocks(); state.user = null; vi.stubEnv("GRIM_SITE_URL", "https://example.invalid"); vi.stubEnv("GRIM_STAFF_USER_IDS", "staff"); vi.stubEnv("GRIM_ADDITIONAL_STAFF_USER_IDS", ""); state.read.mockResolvedValue({ jobs: [], references: null, orders: [], referenceRevision: 0, reportsAt: null }); });
afterEach(() => vi.unstubAllEnvs());
it("protects page, data, writes, and exports before database access", async () => {
  for (const user of [null, { id: "member" }]) {
    state.user = user;
    for (const endpoint of [url, url + "?export=csv"]) expect((await GET(new Request(endpoint))).status).toBe(user ? 403 : 401);
    expect((await POST(request("{}"))).status).toBe(user ? 403 : 401);
    await expect(Page()).rejects.toThrow("NOT_FOUND");
  }
  expect(state.db).not.toHaveBeenCalled();
});
it("rejects CSRF, unexpected inputs and oversized uploads; never mutates on preview failures", async () => {
  state.user = { id: "staff" };
  expect((await POST(request("{}", "https://evil.invalid"))).status).toBe(403);
  expect((await POST(request(JSON.stringify({ action: "save", id: "bad", revision: 0 })))).status).toBe(400);
  expect((await POST(request("x".repeat(1_500_001)))).status).toBe(400);
  expect((await POST(request(JSON.stringify({ action: "preview", csv: "invalid", unit: "gram", revision: 0 })))).status).toBe(400);
  expect(state.db).not.toHaveBeenCalled(); expect(state.refs).not.toHaveBeenCalled();
});
it("serves private exports and hides internal errors", async () => {
  state.user = { id: "staff" };
  const response = await GET(new Request(url + "?export=csv"));
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("private, no-store"); expect(response.headers.get("content-disposition")).toContain("attachment");
  state.read.mockRejectedValueOnce(Error("secret-database"));
  const failure = await GET(new Request(url)); expect(failure.status).toBe(503); expect(await failure.text()).not.toContain("secret-database");
});
