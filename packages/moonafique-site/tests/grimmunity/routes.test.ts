import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  user: null as null | { id: string; email: string },
  checkout: vi.fn(),
  portal: vi.fn(),
  lock: vi.fn(),
  csv: vi.fn(),
  save: vi.fn(),
  price: vi.fn(),
  cart: vi.fn(),
  contacts: vi.fn(),
  emails: vi.fn(),
}));
vi.mock("@workos-inc/authkit-nextjs", () => ({
  withAuth: async () => ({ user: state.user }),
}));
vi.mock("@/lib/grimmunity/runtime", () => ({
  club: () => ({
    checkout: state.checkout,
    portal: state.portal,
    lockOrder: state.lock,
    packingCSV: state.csv,
  }),
  grimMode: () => "sandbox",
}));
vi.mock("@/lib/grimmunity/editions", () => ({ saveEdition: state.save }));
vi.mock("@/lib/stripe", () => ({
  stripe: { prices: { retrieve: state.price } },
  createCheckoutSession: state.cart,
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: () => false }));
vi.mock("resend", () => ({
  Resend: class {
    contacts = { create: state.contacts };
    emails = { send: state.emails };
  },
}));
import { POST as checkout } from "@/app/api/grimmunity/checkout/route";
import { POST as portal } from "@/app/api/grimmunity/portal/route";
import { POST as admin } from "@/app/api/grimmunity/admin/route";
import { POST as editions } from "@/app/api/grimmunity/editions/route";
import { GET as packing } from "@/app/api/grimmunity/packing/route";
import { POST as cart } from "@/app/api/checkout/route";
import { POST as newsletter } from "@/app/api/subscribe/route";
import { POST as shippingQuote } from "@/app/api/grimmunity/shipping-quote/route";
import { POST as shipping } from "@/app/api/grimmunity/shipping/route";
import { POST as preferences } from "@/app/api/grimmunity/preferences/route";
import { NextRequest } from "next/server";
import { isOneTimeProduct } from "@/lib/catalog-policy";
import type Stripe from "stripe";
const request = (body: unknown = {}, origin = "http://localhost:3000") =>
  new NextRequest("http://localhost:3000/api/test", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  state.user = null;
  process.env.SERVER_URL = "http://localhost:3000";
  process.env.GRIM_STAFF_USER_IDS = "user_staff";
  process.env.RESEND_API_KEY = "re_fixture";
});
describe("route authorization and ordinary storefront regression", () => {
  it("requires WorkOS on checkout, portal, all staff writes and exports", async () => {
    for (const handler of [
      checkout,
      portal,
      admin,
      editions,
      shippingQuote,
      shipping,
      preferences,
    ])
      expect((await handler(request())).status).toBe(401);
    expect(
      (
        await packing(
          new Request("http://localhost:3000/api/grimmunity/packing"),
        )
      ).status,
    ).toBe(401);
    expect(state.checkout).not.toHaveBeenCalled();
  });
  it("rejects customer access to staff endpoints and exports", async () => {
    state.user = { id: "user_customer", email: "customer@example.invalid" };
    expect((await admin(request())).status).toBe(403);
    expect((await editions(request())).status).toBe(403);
    expect((await shipping(request())).status).toBe(403);
    expect(
      (
        await packing(
          new Request("http://localhost:3000/api/grimmunity/packing"),
        )
      ).status,
    ).toBe(403);
  });
  it("rejects cross-origin state changes before performing work", async () => {
    state.user = { id: "user_staff", email: "staff@example.invalid" };
    expect((await admin(request({}, "https://evil.example"))).status).toBe(403);
    expect((await shipping(request({}, "https://evil.example"))).status).toBe(
      403,
    );
    expect(
      (await shippingQuote(request({}, "https://evil.example"))).status,
    ).toBe(403);
    expect(
      (await preferences(request({}, "https://evil.example"))).status,
    ).toBe(403);
    expect(state.lock).not.toHaveBeenCalled();
  });
  it("uses the authenticated owner and rejects arbitrary portal customer IDs", async () => {
    state.user = { id: "user_customer", email: "customer@example.invalid" };
    state.portal.mockResolvedValue("https://billing.stripe.com/fixture");
    expect((await portal(request({ customer_id: "cus_other" }))).status).toBe(
      400,
    );
    expect((await portal(request())).status).toBe(200);
    expect(state.portal).toHaveBeenCalledExactlyOnceWith("user_customer");
  });
  it("allows explicit staff IDs and validates tracking URLs", async () => {
    state.user = { id: "user_staff", email: "staff@example.invalid" };
    expect(
      (
        await admin(
          request({
            action: "lock",
            id: "11111111-1111-4111-8111-111111111111",
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await admin(
          request({
            action: "ship",
            id: "11111111-1111-4111-8111-111111111111",
            number: "TRACK",
            url: "javascript:alert(1)",
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("rejects recurring products from one-time checkout", async () => {
    state.price.mockResolvedValue({
      type: "recurring",
      active: true,
      unit_amount: 2500,
      currency: "usd",
      product: { active: true, metadata: { grim_subscription: "true" } },
    });
    expect(
      (
        await cart(
          request({
            items: [{ priceId: "price_test", quantity: 1, price: 1 }],
          }),
        )
      ).status,
    ).toBe(400);
    expect(state.cart).not.toHaveBeenCalled();
  });
  it("calculates the ordinary cart total using Stripe prices, not client amounts", async () => {
    state.price.mockResolvedValue({
      type: "one_time",
      active: true,
      unit_amount: 1000,
      currency: "usd",
      product: { active: true, metadata: {} },
    });
    state.cart.mockResolvedValue("https://checkout.stripe.com/fixture");
    expect(
      (
        await cart(
          request({
            items: [{ priceId: "price_test", quantity: 2, price: 1 }],
          }),
        )
      ).status,
    ).toBe(200);
    expect(state.cart).toHaveBeenCalledWith(
      [{ priceId: "price_test", quantity: 2, price: 1 }],
      2000,
    );
    expect((await cart(request({ items: [] }))).status).toBe(200);
  });
  it("filters subscription products from catalog listings and direct product lookup", () => {
    expect(
      isOneTimeProduct({
        active: true,
        metadata: {},
        default_price: { active: true, type: "recurring" },
      } as Stripe.Product),
    ).toBe(false);
    expect(
      isOneTimeProduct({
        active: true,
        metadata: { grim_subscription: "true" },
        default_price: { active: true, type: "one_time" },
      } as unknown as Stripe.Product),
    ).toBe(false);
    expect(
      isOneTimeProduct({
        active: true,
        metadata: {},
        default_price: { active: true, type: "one_time" },
      } as Stripe.Product),
    ).toBe(true);
  });
  it("keeps newsletter signup separate, with no billing or real email", async () => {
    state.contacts.mockResolvedValue({
      data: { id: "contact_fixture" },
      error: null,
    });
    state.emails.mockResolvedValue({
      data: { id: "email_fixture" },
      error: null,
    });
    expect(
      (await newsletter(request({ email: "fixture@example.invalid" }))).status,
    ).toBe(200);
    expect(state.contacts).toHaveBeenCalled();
    expect(state.emails).toHaveBeenCalled();
    expect(state.checkout).not.toHaveBeenCalled();
    expect((await newsletter(request({ email: "bad" }))).status).toBe(400);
  });
});
