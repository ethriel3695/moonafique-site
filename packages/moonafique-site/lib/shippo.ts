import { Shippo } from "shippo";
import { ClubError, type Address, type Mode } from "./grimmunity/model";
import {
  shippingOrigin,
  shippoAddress,
  type Parcel,
} from "./grimmunity/shipping-profile";

export type ShippingRate = {
  id: string;
  amount: number;
  currency: "usd";
  carrier: string;
  service: string;
  estimated_days: number | null;
};
export type LabelResult = {
  id: string;
  status: string;
  label_url: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  test: boolean;
  reference: string | null;
  rate_id: string | null;
};
export interface ShippingGateway {
  quote(
    address: Address,
    parcel: Parcel,
    reference: string,
  ): Promise<{ shipment_id: string; rates: ShippingRate[] }>;
  buy(rateId: string, reference: string): Promise<LabelResult>;
  transaction(id: string): Promise<LabelResult>;
}
export function shippoConfigured(mode: Mode) {
  return (process.env.SHIPPO_API_KEY ?? "").startsWith(
    mode === "live" ? "shippo_live_" : "shippo_test_",
  );
}
export function shippoGateway(mode: Mode): ShippingGateway {
  if (!shippoConfigured(mode)) throw new ClubError("shipping_unavailable", 503);
  return new ShippoGateway(
    new Shippo({ apiKeyHeader: process.env.SHIPPO_API_KEY!, timeoutMs: 20000 }),
    mode,
  );
}
export class ShippoGateway implements ShippingGateway {
  constructor(
    private client: Shippo,
    private mode: Mode,
  ) {}
  async quote(address: Address, parcel: Parcel, reference: string) {
    const result = await this.client.shipments.create({
      addressFrom: shippingOrigin(),
      addressTo: shippoAddress(address),
      parcels: [
        {
          length: String(parcel.length),
          width: String(parcel.width),
          height: String(parcel.height),
          weight: String(parcel.weight),
          distanceUnit: "in",
          massUnit: "oz",
        },
      ],
      async: false,
      metadata: reference,
    });
    if (result.status !== "SUCCESS")
      throw new ClubError("shipping_quote_failed", 503);
    const rates = result.rates
      .filter(
        (rate) =>
          rate.test === (this.mode === "sandbox") &&
          rate.currency.toLowerCase() === "usd" &&
          /^\d+(?:\.\d{1,2})?$/.test(rate.amount),
      )
      .map((rate) => ({
        id: rate.objectId,
        amount: Math.round(Number(rate.amount) * 100),
        currency: "usd" as const,
        carrier: rate.provider,
        service:
          rate.servicelevel.name ?? rate.servicelevel.token ?? "Shipping",
        estimated_days: rate.estimatedDays ?? null,
      }))
      .filter((rate) => rate.amount > 0)
      .sort((a, b) => a.amount - b.amount);
    if (!rates.length) throw new ClubError("shipping_quote_failed", 503);
    return { shipment_id: result.objectId, rates };
  }
  private normalize(
    value: Awaited<ReturnType<Shippo["transactions"]["get"]>>,
  ): LabelResult {
    if (value.test !== (this.mode === "sandbox"))
      throw new ClubError("shipping_mode_mismatch", 503);
    if (!value.objectId) throw new ClubError("shipping_purchase_review", 503);
    return {
      id: value.objectId,
      status: value.status ?? "UNKNOWN",
      label_url: value.labelUrl ?? null,
      tracking_number: value.trackingNumber ?? null,
      tracking_url: value.trackingUrlProvider ?? null,
      reference: value.metadata ?? null,
      rate_id:
        typeof value.rate === "string"
          ? value.rate
          : (value.rate?.objectId ?? null),
      test: value.test,
    };
  }
  async buy(rateId: string, reference: string) {
    const result = await this.client.transactions.create(
      {
        rate: rateId,
        metadata: reference,
        async: false,
        labelFileType: "PDF_4x6",
      },
      { retries: { strategy: "none" } },
    );
    return this.normalize(result);
  }
  async transaction(id: string) {
    return this.normalize(await this.client.transactions.get(id));
  }
}
