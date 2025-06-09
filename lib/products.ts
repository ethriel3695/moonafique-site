import { ProductListResponse, ProductWithPrice } from '@/lib/schema';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function getProducts(
  options: Stripe.ProductListParams & { search?: string } = {
    limit: 4,
    active: true,
  }
): Promise<ProductListResponse | undefined> {
  try {
    const { search } = options;
    const products = await stripe.products.list({
      limit: 100, // Get all products to handle search and pagination properly
      active: true,
      expand: ['data.default_price'],
    });

    let filteredProducts = products.data;

    if (search) {
      const searchTerms = search.toLowerCase().split(/\s+/);
      filteredProducts = products.data.filter((product) => {
        const searchableText = [
          product.name.toLowerCase(),
          product.description?.toLowerCase() || '',
          product.metadata?.category?.toLowerCase() || '',
        ].join(' ');

        return searchTerms.every((term) => searchableText.includes(term));
      });
    }

    // If we're paginating and have a search term, we need to handle the starting_after correctly
    const startingAfterIndex = options.starting_after
      ? filteredProducts.findIndex((p) => p.id === options.starting_after)
      : -1;

    const limit = options.limit || 4;

    // Get the slice of products after the starting_after point
    const paginatedProducts =
      startingAfterIndex >= 0
        ? filteredProducts.slice(
            startingAfterIndex + 1,
            startingAfterIndex + 1 + limit
          )
        : filteredProducts.slice(0, limit);

    // Check if there are more products after our current page
    const hasMore =
      startingAfterIndex >= 0
        ? startingAfterIndex + 1 + paginatedProducts.length <
          filteredProducts.length
        : paginatedProducts.length < filteredProducts.length;

    return {
      data: paginatedProducts.map(productToProductWithPrice),
      has_more: hasMore,
      starting_after: paginatedProducts[paginatedProducts.length - 1]?.id,
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return undefined;
  }
}

export async function getProduct(id: string): Promise<ProductWithPrice | null> {
  try {
    const product = await stripe.products.retrieve(id, {
      expand: ['default_price'],
    });
    return productToProductWithPrice(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

function productToProductWithPrice(product: Stripe.Product): ProductWithPrice {
  const price = product.default_price as Stripe.Price;
  const amount = price.unit_amount ? price.unit_amount / 100 : undefined;

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    images: product.images,
    price: {
      id: price.id,
      amount: amount ?? 0,
      display_amount:
        amount?.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        }) ?? '$0.00',
    },
    metadata: product.metadata,
  };
}
