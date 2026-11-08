import { Homepage } from "@/components/homepage";
import { ProductList } from "@/components/product-list";
import { getProducts } from "@/lib/products";
import { getLiveSchedule } from "@/lib/live-shows-server";
import { LiveShowsProvider } from "@/components/live-shows-provider";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ search?: string | string[] }> }) {
  const params = await searchParams;
  const searchQuery = (typeof params.search === "string" ? params.search : "").trim();
  const [products, schedule] = await Promise.all([getProducts({ limit: 8, search: searchQuery }), getLiveSchedule()]);
  const newsletterPaused = process.env.GRIM_MODE === "live" && (
    process.env.NEWSLETTER_SEND_EMAILS !== "approved" ||
    !process.env.RESEND_NEWSLETTER_SEGMENT_ID
  );
  return (
    <LiveShowsProvider initialSchedule={schedule}><Homepage
      catalog={<ProductList key={searchQuery} initialList={products} searchQuery={searchQuery} />}
      initialNow={new Date().toISOString()}
      newsletter={newsletterPaused ? (
        <p id="newsletter-email" className="text-sm">
          Newsletter signups are paused for now.
        </p>
      ) : undefined}
    /></LiveShowsProvider>
  );
}
