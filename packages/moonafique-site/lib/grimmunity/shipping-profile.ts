import { z } from "zod";
import { type Address } from "./model";
import { tierClub, type Tier } from "./tiers";
import { grimmParcel, aceoParcel } from "./package-profiles";
export { grimmParcel, aceoParcel } from "./package-profiles";

export const parcelSchema = z
  .object({
    length: z.number().positive().max(60),
    width: z.number().positive().max(60),
    height: z.number().positive().max(60),
    weight: z.number().positive().max(1120),
  })
  .strict();
export type Parcel = z.infer<typeof parcelSchema>;
// Server-only return address. Never import this module into a client component.
export function shippingOrigin() {
  return {
    name: "Moonafique",
    street1: "798 N 4000 E",
    city: "Rigby",
    state: "ID",
    zip: "83442",
    country: "US",
    email: "hello@moonafique.com",
    ...(process.env.SHIPPO_FROM_PHONE
      ? { phone: process.env.SHIPPO_FROM_PHONE }
      : {}),
  };
}
export function shippingParcel(tier: Pick<Tier, "id">): Parcel {
  return { ...(tierClub(tier) === "grimm" ? grimmParcel : aceoParcel) };
}
export function shippoAddress(address: Address) {
  return {
    name: address.name,
    street1: address.line1,
    street2: address.line2,
    city: address.city,
    state: address.state,
    zip: address.postal_code,
    country: address.country,
  };
}
export const deliveryAddressSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    line1: z.string().trim().min(1).max(150),
    line2: z.string().trim().max(150).default(""),
    city: z.string().trim().min(1).max(100),
    state: z
      .string()
      .trim()
      .regex(/^[A-Z]{2}$/),
    postal_code: z
      .string()
      .trim()
      .regex(/^\d{5}(?:-\d{4})?$/),
    country: z.literal("US"),
  })
  .strict();
