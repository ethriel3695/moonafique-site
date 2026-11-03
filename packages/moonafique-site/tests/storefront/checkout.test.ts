import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ retrieve: vi.fn(), checkout: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  stripe: { prices: { retrieve: mocks.retrieve } },
  createCheckoutSession: mocks.checkout,
}));
import { POST } from "@/app/api/checkout/route";
const price = {
  active: true,
  type: "one_time",
  unit_amount: 1500,
  currency: "usd",
  product: { id: "prod_test", active: true, metadata: { stock: "8" } },
};
const request = (items: unknown) =>
  new NextRequest("https://www.moonafique.com/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.retrieve.mockResolvedValue(price);
  mocks.checkout.mockResolvedValue("https://checkout.stripe.com/test");
});
afterEach(() => vi.unstubAllEnvs());
describe("checkout availability and authoritative totals", () => {
  it("uses the selected quantity and provider price instead of a submitted amount", async () => {
    const response = await POST(
      request([{ priceId: "price_test", quantity: 3, price: 0.01 }]),
    );
    expect(response.status).toBe(200);
    expect(mocks.checkout).toHaveBeenCalledWith(
      [{ priceId: "price_test", quantity: 3 }],
      4500,
    );
  });
  it("combines duplicate lines before checking stock", async () => {
    expect(
      (
        await POST(
          request([
            { priceId: "price_test", quantity: 5 },
            { priceId: "price_test", quantity: 4 },
          ]),
        )
      ).status,
    ).toBe(400);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it.each(["comingSoon", "soldOut"])(
    "prevents checkout of %s pieces even with a direct price ID",
    async (status) => {
      mocks.retrieve.mockResolvedValue({
        ...price,
        product: { ...price.product, metadata: { status } },
      });
      expect(
        (await POST(request([{ priceId: "price_test", quantity: 1 }]))).status,
      ).toBe(400);
      expect(mocks.checkout).not.toHaveBeenCalled();
    },
  );
  it("allows explicitly made-to-order pieces with zero ready stock", async () => {
    mocks.retrieve.mockResolvedValue({
      ...price,
      product: {
        ...price.product,
        metadata: { stock: "0", madeToOrder: "true" },
      },
    });
    expect(
      (await POST(request([{ priceId: "price_test", quantity: 2 }]))).status,
    ).toBe(200);
  });
  it.each([0, -1, 1.5, 101])(
    "rejects invalid quantities: %s",
    async (quantity) => {
      expect(
        (await POST(request([{ priceId: "price_test", quantity }]))).status,
      ).toBe(400);
      expect(mocks.checkout).not.toHaveBeenCalled();
    },
  );
  it("keeps subscription prices outside the one-time cart", async () => {
    mocks.retrieve.mockResolvedValue({ ...price, type: "recurring" });
    expect(
      (await POST(request([{ priceId: "price_test", quantity: 1 }]))).status,
    ).toBe(400);
  });
});
