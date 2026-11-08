// One-time shop orders only. Membership postage is quoted separately through Shippo.
export const shopShipping = {
  freeThreshold: 10_000,
  standard: { id: "shr_1RSMAiDuU4RwQbePSiZHbxQV", amount: 700, estimate: "5–7 business days" },
  express: { id: "shr_1RSMB7DuU4RwQbePbLwJPaRl", amount: 1500, estimate: "2–3 business days" },
  free: { id: "shr_1RNwsfDuU4RwQbePqls6XYCz", amount: 0, estimate: "5–7 business days" },
} as const;

export function shopShippingOptions(subtotal: number) {
  return subtotal >= shopShipping.freeThreshold
    ? [{ shipping_rate: shopShipping.free.id }]
    : [{ shipping_rate: shopShipping.standard.id }, { shipping_rate: shopShipping.express.id }];
}
