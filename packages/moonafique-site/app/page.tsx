import { Homepage } from "@/components/homepage";
import { ProductList } from "@/components/product-list";
import { getProducts } from "@/lib/products";

export default async function Page() {
  const products = await getProducts({ limit: 8 });
  const newsletterPaused = process.env.GRIM_MODE === "live" && (
    process.env.NEWSLETTER_SEND_EMAILS !== "approved" ||
    !process.env.RESEND_NEWSLETTER_SEGMENT_ID
  );
  return (
    <Homepage
      catalog={<ProductList initialList={products} />}
      newsletter={newsletterPaused ? (
        <p id="newsletter-email" className="text-sm">
          Newsletter signups are paused for now.
        </p>
      ) : undefined}
    />
  );
}
