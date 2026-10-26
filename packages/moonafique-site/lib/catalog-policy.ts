import type Stripe from "stripe";
export function isOneTimeProduct(product: Stripe.Product): boolean {
  const price = product.default_price;
  return (
    product.active &&
    product.metadata.grim_subscription !== "true" &&
    !!price &&
    typeof price !== "string" &&
    price.active &&
    price.type === "one_time"
  );
}
export function isOneTimePrice(price: Stripe.Price): boolean {
  const product = price.product;
  return (
    price.active &&
    price.type === "one_time" &&
    price.unit_amount !== null &&
    price.unit_amount >= 0 &&
    typeof product !== "string" &&
    !product.deleted &&
    product.active &&
    product.metadata.grim_subscription !== "true"
  );
}
