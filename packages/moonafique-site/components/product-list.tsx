'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProductListThumbnail, ProductListThumbnailSkeleton } from '@/components/product-list-thumbnail';
import { type ProductListResponse } from '@/lib/schema';
import { displayProducts, fetchProductPage } from '@/lib/product-results';

export function ProductList({ initialList, searchQuery = '' }: {
  initialList: ProductListResponse | undefined;
  searchQuery?: string;
}) {
  const [replacement, setReplacement] = useState<ProductListResponse>();
  const [pages, setPages] = useState<ProductListResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(!initialList);
  const request = useRef<AbortController | null>(null);
  const firstPage = replacement ?? initialList;
  const lastPage = pages.at(-1) ?? firstPage;
  const products = [firstPage, ...pages].flatMap(displayProducts);
  const hasMore = lastPage?.has_more ?? false;
  useEffect(() => () => request.current?.abort(), []);

  async function loadPage() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(false);
    try {
      const cursor = firstPage ? lastPage?.starting_after ?? products.at(-1)?.id : undefined;
      const page = await fetchProductPage(searchQuery, cursor, controller.signal);
      if (controller.signal.aborted) return;
      if (firstPage) setPages(previous => [...previous, page]);
      else setReplacement(page);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <div className="relative mb-8 flex w-full min-w-0 flex-col items-center gap-8 px-4">
      {searchQuery && (
        <div className="flex w-full min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <h2 className="min-w-0 break-words text-2xl font-bold">Search results for: {searchQuery}</h2>
          <Button asChild variant="outline" size="sm" className="shrink-0"><Link href="/#shop">View all products</Link></Button>
        </div>
      )}
      <div aria-live="polite" role="status" className={error || (!loading && products.length === 0) ? 'w-full rounded-3xl border bg-card p-8 text-center' : 'sr-only'}>
        {loading ? 'Loading pieces…' : error ? (
          <><p className="font-semibold">The shop needs a moment.</p><p className="mt-2 text-muted-foreground">We couldn’t load {firstPage ? 'more pieces' : 'the collection'}. Please try again.</p></>
        ) : products.length === 0 ? (
          <><p className="text-xl font-semibold">No creatures found here… yet.</p><p className="mt-2 text-muted-foreground">{searchQuery ? 'Try a different name, a shorter search, or browse all our pieces.' : 'Check back for new pieces, or explore our collections.'}</p><Link href="/#collections" className="mt-4 inline-block font-semibold text-primary underline underline-offset-4">Explore collections</Link></>
        ) : `${products.length} ${products.length === 1 ? "piece" : "pieces"} shown.`}
      </div>
      <div aria-busy={loading} className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {products.map(product => <ProductListThumbnail key={product.id} product={product} />)}
        {loading && Array.from({ length: 4 }, (_, index) => <ProductListThumbnailSkeleton key={`skeleton-${index}`} />)}
      </div>
      {(error || hasMore) && <Button onClick={loadPage} disabled={loading}>{loading ? 'Loading…' : error ? 'Try again' : 'Load more'}</Button>}
    </div>
  );
}
