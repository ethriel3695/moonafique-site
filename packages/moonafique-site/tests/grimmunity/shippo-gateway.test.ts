import { beforeEach, expect, it, vi } from "vitest";
import type { Shippo } from "shippo";
import { ShippoGateway, shippoConfigured } from "../../lib/shippo";
import { shippingParcel } from "../../lib/grimmunity/shipping-profile";
import { delivery } from "./fake-billing";
const shipments = { create: vi.fn() },
  transactions = { create: vi.fn(), get: vi.fn() };
const gateway = new ShippoGateway(
  { shipments, transactions } as unknown as Shippo,
  "sandbox",
);
beforeEach(() => {
  vi.resetAllMocks();
});
it("sends the approved origin, dimensions, units, and packed weight to Shippo without buying a label", async () => {
  shipments.create.mockResolvedValue({
    objectId: "shipment_fixture",
    status: "SUCCESS",
    rates: [
      {
        objectId: "rate_test",
        amount: "6.25",
        currency: "USD",
        provider: "USPS",
        test: true,
        servicelevel: { name: "Ground Advantage" },
      },
      {
        objectId: "wrong_mode",
        amount: "1.00",
        currency: "USD",
        provider: "USPS",
        test: false,
        servicelevel: { name: "Ground Advantage" },
      },
    ],
  });
  const result = await gateway.quote(
    delivery,
    shippingParcel({ id: "grimm_keeper" }),
    "membership:fixture",
  );
  expect(shipments.create).toHaveBeenCalledWith(
    expect.objectContaining({
      async: false,
      addressFrom: expect.objectContaining({
        street1: "798 N 4000 E",
        city: "Rigby",
        state: "ID",
        zip: "83442",
        country: "US",
      }),
      parcels: [
        {
          length: "8",
          width: "8",
          height: "8",
          weight: "8",
          distanceUnit: "in",
          massUnit: "oz",
        },
      ],
    }),
  );
  expect(result.rates.map((r) => [r.id, r.amount])).toEqual([
    ["rate_test", 625],
  ]);
  expect(transactions.create).not.toHaveBeenCalled();
});
it("disables purchase retries and requests a 4 by 6 PDF label", async () => {
  transactions.create.mockResolvedValue({
    objectId: "transaction_fixture",
    status: "SUCCESS",
    test: true,
    labelUrl: "https://example.invalid/label.pdf",
    trackingNumber: "TRACK",
    metadata: "order:fixture",
    rate: "rate_fixture",
  });
  const result = await gateway.buy("rate_fixture", "order:fixture");
  expect(transactions.create).toHaveBeenCalledWith(
    {
      rate: "rate_fixture",
      metadata: "order:fixture",
      async: false,
      labelFileType: "PDF_4x6",
    },
    { retries: { strategy: "none" } },
  );
  expect(result).toMatchObject({
    reference: "order:fixture",
    rate_id: "rate_fixture",
    test: true,
  });
});
it("requires the correct credential mode and rejects a production transaction in sandbox", async () => {
  const original = process.env.SHIPPO_API_KEY;
  try {
    process.env.SHIPPO_API_KEY = "shippo_test_fixture";
    expect(shippoConfigured("live")).toBe(false);
    expect(shippoConfigured("sandbox")).toBe(true);
    transactions.get.mockResolvedValue({ objectId: "wrong_mode", test: false });
    await expect(gateway.transaction("wrong_mode")).rejects.toThrow(
      "shipping_mode_mismatch",
    );
  } finally {
    if (original === undefined) delete process.env.SHIPPO_API_KEY;
    else process.env.SHIPPO_API_KEY = original;
  }
});
