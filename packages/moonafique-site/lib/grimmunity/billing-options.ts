import { z } from "zod";

export const billingMonths = [1, 6, 12] as const;
export type BillingMonths = (typeof billingMonths)[number];

// Owner-approved October 26, 2026. Postage is never discounted or prepaid.
export function membershipBilling(amount: number, months: BillingMonths) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    !billingMonths.includes(months)
  )
    throw new Error("Invalid membership billing option");
  const discount: 0 | 5 | 10 = months === 12 ? 10 : months === 6 ? 5 : 0;
  const undiscounted = amount * months;
  const total = Math.round((undiscounted * (100 - discount)) / 100);
  if (!Number.isSafeInteger(total))
    throw new Error("Invalid membership amount");
  return {
    months,
    discount,
    amount: total,
    savings: undiscounted - total,
    recurring:
      months === 12
        ? { interval: "year" as const, interval_count: 1 }
        : { interval: "month" as const, interval_count: months },
  };
}

export const billingOptionSchema = z
  .object({
    months: z.union([z.literal(1), z.literal(6), z.literal(12)]),
    discount: z.union([z.literal(0), z.literal(5), z.literal(10)]),
    amount: z.number().int().positive(),
    price_id: z.string().startsWith("price_"),
  })
  .strict();

export type BillingOption = z.infer<typeof billingOptionSchema>;
