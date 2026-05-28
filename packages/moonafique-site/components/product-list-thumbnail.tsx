import { ProductBuyForm } from '@/components/product-buy-form';
import { ProductWithPrice } from '@/lib/schema';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const imageBadgeClassName =
  'absolute right-3 top-3 shadow-[0_8px_22px_rgb(0_0_0_/_0.32)] ring-1 ring-white/75';

function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted ">
      <div className="text-center p-4">
        <div className="text-2xl font-semibold text-muted-foreground mb-2 ">
          Coming Soon
        </div>
      </div>
    </div>
  );
}

export function ProductListThumbnail({
  product,
}: {
  product: ProductWithPrice;
}) {
  const stock = product.metadata?.stock;
  const status = product.metadata?.status;
  const isMadeToOrder =
    status === 'madeToOrder' ||
    (stock === 0 && product.metadata?.madeToOrder === true);
  const isSoldOut = status === 'soldOut' || (stock === 0 && !isMadeToOrder);
  const isComingSoon = status === 'comingSoon';
  const isLimitedEdition = status === 'limitedEdition';
  const isNew = status === 'new';
  const isFeatured = status === 'featured';
  const isOnSale = status === 'onSale';
  const hasImage = product.images?.[0];

  if (isSoldOut) {
    return null; // Don't show sold out products
  }

  return (
    <div className="group relative bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-t-xl">
          {hasImage ? (
            <>
              <Image
                src={hasImage}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </>
          ) : (
            <ImagePlaceholder />
          )}
          {isMadeToOrder && (
            <Badge variant="madeToOrder" className={imageBadgeClassName}>
              Made to Order
            </Badge>
          )}
          {isComingSoon && (
            <Badge variant="comingSoon" className={imageBadgeClassName}>
              Coming Soon
            </Badge>
          )}
          {isLimitedEdition && (
            <Badge variant="limitedEdition" className={imageBadgeClassName}>
              Limited Edition
            </Badge>
          )}
          {isNew && (
            <Badge variant="new" className={imageBadgeClassName}>
              New
            </Badge>
          )}
          {isFeatured && (
            <Badge variant="featured" className={imageBadgeClassName}>
              Featured
            </Badge>
          )}
          {isOnSale && (
            <Badge variant="onSale" className={imageBadgeClassName}>
              On Sale
            </Badge>
          )}
        </div>
      </Link>
      <div className="p-4">
        <div className="flex flex-col gap-2">
          <Link
            href={`/product/${product.id}`}
            className="font-semibold text-lg hover:text-primary transition-colors duration-200 line-clamp-1"
            title={product.name}
          >
            {product.name}
          </Link>
          <div className="text-lg font-medium text-primary">
            {product.price.display_amount}
          </div>
          <div className="mt-2">
            <ProductBuyForm product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductListThumbnailSkeleton() {
  return (
    <div className="bg-card rounded-xl shadow-sm">
      <div className="bg-muted aspect-square rounded-t-xl animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
