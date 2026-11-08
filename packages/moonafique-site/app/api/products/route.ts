import { getProducts } from '@/lib/products';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cursor = searchParams.get('cursor');
  const search = searchParams.get('search');
  const products = await getProducts({
    limit: 8,
    starting_after: cursor || undefined,
    search: search || undefined,
  });
  if (!products) return NextResponse.json({ error: "The shop could not load. Please try again." }, { status: 503 });
  return NextResponse.json(products);
}
