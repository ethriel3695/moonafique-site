import { getProducts } from '@/lib/products';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { ProductBuyForm } from '@/components/product-buy-form';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle } from 'lucide-react';
import { Product } from '@/lib/schema';

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const productsResponse = await getProducts();
  const product = productsResponse?.data.find(
    (p: Product) => p.id === params.id
  );

  if (!product) {
    notFound();
  }

  const stock = product.metadata?.stock;
  const status = product.metadata?.status;
  const isMadeToOrder =
    status === 'madeToOrder' ||
    (stock === 0 && product.metadata?.madeToOrder === true);
  const isComingSoon = status === 'comingSoon';
  const isLimitedEdition = status === 'limitedEdition';
  const isNew = status === 'new';
  const isFeatured = status === 'featured';
  const isOnSale = status === 'onSale';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-muted-foreground">Coming Soon</p>
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.slice(1).map((image: string, index: number) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                >
                  <Image
                    src={image}
                    alt={`${product.name} - View ${index + 2}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {product.name}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              {isMadeToOrder && (
                <Badge variant="madeToOrder">Made to Order</Badge>
              )}
              {isComingSoon && <Badge variant="comingSoon">Coming Soon</Badge>}
              {isLimitedEdition && (
                <Badge variant="limitedEdition">Limited Edition</Badge>
              )}
              {isNew && <Badge variant="new">New</Badge>}
              {isFeatured && <Badge variant="featured">Featured</Badge>}
              {isOnSale && <Badge variant="onSale">On Sale</Badge>}
            </div>
          </div>

          <div className="text-2xl font-semibold text-primary">
            {product.price.display_amount}
          </div>

          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-4">
              <div className="prose prose-sm max-w-none">
                <p>{product.description}</p>
              </div>
            </TabsContent>
            <TabsContent value="details" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Size</h3>
                  <p className="text-muted-foreground">
                    {product.metadata?.size}
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="shipping" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Processing Time</h3>
                  <p className="text-muted-foreground">
                    {isMadeToOrder
                      ? 'Made to order items typically ship within 2-3 weeks'
                      : 'In stock items typically ship within 1-2 business days'}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Shipping Options</h3>
                  <p className="text-muted-foreground">
                    Standard shipping: 3-5 business days
                    <br />
                    Express shipping: 1-2 business days
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          {/* Important Notice */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Important Notice</h3>
                <p className="text-sm text-muted-foreground">
                  This is a collectible 3D printed item, not a toy. Not suitable
                  for children under 3 years of age. Handle with care as pieces
                  may be delicate.
                </p>
              </div>
            </div>
          </div>

          {/* Purchase Form */}
          <div className="pt-4">
            <ProductBuyForm product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
