import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProductPage } from "../../lib/product-results";
const signal = new AbortController().signal;
afterEach(() => vi.unstubAllGlobals());
describe("recoverable shop requests", () => {
  it("encodes searches and pagination, and passes cancellation through", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: [], has_more: false }));
    vi.stubGlobal("fetch", fetcher);
    await expect(fetchProductPage("grimm & moon", "prod_1", signal)).resolves.toEqual({ data: [], has_more: false });
    expect(fetcher).toHaveBeenCalledWith("/api/products?search=grimm+%26+moon&cursor=prod_1", { signal });
  });
  it("treats server failure as retryable failure, never an empty collection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "unavailable" }, { status: 503 })));
    await expect(fetchProductPage("", undefined, signal)).rejects.toThrow("Shop unavailable");
  });
  it("rejects malformed successful responses instead of silently clearing the shop", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "unexpected" })));
    await expect(fetchProductPage("", undefined, signal)).rejects.toThrow();
  });
});
