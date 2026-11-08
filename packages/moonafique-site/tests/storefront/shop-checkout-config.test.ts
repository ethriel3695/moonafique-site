import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { shopShipping, shopShippingOptions } from "../../lib/shop-shipping";
import { shopPaymentStatus } from "../../lib/shop-confirmation";
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("stripe", () => ({ default: class { checkout = { sessions: { create: mocks.create } }; } }));
let createCheckoutSession: typeof import("../../lib/stripe").createCheckoutSession;
beforeAll(async () => { vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture"); ({ createCheckoutSession } = await import("../../lib/stripe")); });
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe("shop shipping and return links", () => {
  it("charges shipping below $100 and gives free standard shipping at $100", () => {
    expect(shopShippingOptions(9999)).toEqual([{ shipping_rate: shopShipping.standard.id }, { shipping_rate: shopShipping.express.id }]);
    expect(shopShippingOptions(10000)).toEqual([{ shipping_rate: shopShipping.free.id }]);
    expect(shopShippingOptions(10001)).toEqual([{ shipping_rate: shopShipping.free.id }]);
  });
  it("collects a U.S. delivery address and uses real return routes", async () => {
    vi.stubEnv("GRIM_SITE_URL", "https://www.moonafique.com");
    vi.stubEnv("SERVER_URL", "http://localhost:3000");
    mocks.create.mockResolvedValue({ url: "https://checkout.stripe.com/fixture" });
    await createCheckoutSession([{ priceId: "price_fixture", quantity: 2 }], 5000);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      shipping_address_collection: { allowed_countries: ["US"] }, mode: "payment",
      shipping_options: shopShippingOptions(5000),
      success_url: "https://www.moonafique.com/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://www.moonafique.com/#shop",
      line_items: [{ price: "price_fixture", quantity: 2 }],
    }));
  });
});
describe("payment confirmation without exposing order details", () => {
  const id = "cs_live_abcdefghijklmnopqrstuv";
  it("only confirms completed, paid one-time sessions", async () => {
    const retrieve = vi.fn().mockResolvedValue({ mode: "payment", status: "complete", payment_status: "paid" });
    expect(await shopPaymentStatus(id, retrieve)).toBe("paid");
    retrieve.mockResolvedValue({ mode: "payment", status: "complete", payment_status: "unpaid" });
    expect(await shopPaymentStatus(id, retrieve)).toBe("pending");
    for (const session of [{ mode: "subscription", status: "complete", payment_status: "paid" }, { mode: "payment", status: "open", payment_status: "unpaid" }]) {
      retrieve.mockResolvedValue(session); expect(await shopPaymentStatus(id, retrieve)).toBe("unavailable");
    }
  });
  it("handles missing/invalid links and provider failure without claiming success", async () => {
    const retrieve = vi.fn().mockRejectedValue(new Error("unavailable"));
    expect(await shopPaymentStatus(undefined, retrieve)).toBe("unavailable");
    expect(await shopPaymentStatus("not-a-session", retrieve)).toBe("unavailable");
    expect(retrieve).not.toHaveBeenCalled();
    expect(await shopPaymentStatus(id, retrieve)).toBe("unavailable");
  });
});
