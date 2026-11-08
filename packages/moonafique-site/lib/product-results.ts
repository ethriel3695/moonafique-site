import { productListSchema, type ProductListResponse, type ProductWithPrice } from "./schema";

export function displayProducts(list: ProductListResponse | undefined): ProductWithPrice[] {
  return (list?.data ?? []).map(product => ({
    ...product,
    price: { ...product.price, amount: product.price.amount ?? 0, display_amount: product.price.display_amount ?? "" },
  }));
}

export async function fetchProductPage(search: string, cursor: string | undefined, signal: AbortSignal): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/products?${params}`, { signal });
  if (!response.ok) throw new Error("Shop unavailable");
  return productListSchema.parse(await response.json());
}
