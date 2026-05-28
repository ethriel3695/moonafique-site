'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '@/lib/schema';
import { useToast } from '@/components/ui/use-toast';
import { useCartContext } from '@/lib/cart-context';

interface ProductBuyFormProps {
  product: Product;
}

export function ProductBuyForm({ product }: ProductBuyFormProps) {
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const { addItem, loading } = useCartContext();

  const handleQuantityChange = (value: number) => {
    if (value >= 1) {
      setQuantity(value);
    }
  };

  const handleAddToCart = async () => {
    if (!product.images?.[0]) return;

    await addItem({
      id: product.id,
      name: product.name,
      price: {
        id: product.price.id,
        unit_amount: product.price.amount || 0,
      },
      image: product.images[0],
    });

    toast({
      title: 'Added to cart',
      description: `${quantity} ${product.name} added to your cart`,
    });
  };

  const isMadeToOrder =
    product.metadata?.status === 'madeToOrder' ||
    (product.metadata?.stock === 0 && product.metadata?.madeToOrder === true);
  const isComingSoon = product.metadata?.status === 'comingSoon';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
            className="w-16 text-center"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={handleAddToCart}
        disabled={isComingSoon || loading}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        {isComingSoon
          ? 'Coming Soon'
          : isMadeToOrder
            ? 'Pre-order Now'
            : 'Add to Cart'}
      </Button>
    </div>
  );
}
