import { Homepage } from "@/components/homepage";
import { ProductList } from "@/components/product-list";
import { getProducts } from "@/lib/products";

export default async function Page() {
  const products = await getProducts({ limit: 8 });
  return <Homepage catalog={<ProductList initialList={products} />} />;
}
