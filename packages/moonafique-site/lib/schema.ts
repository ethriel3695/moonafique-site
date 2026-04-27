import { z } from 'zod';

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  images: z.array(z.string()).optional(),
  price: z.object({
    id: z.string(),
    amount: z.number().optional(),
    display_amount: z.string().optional(),
  }),
  metadata: z
    .object({
      category: z.string().optional(),
      stock: z.number().optional(),
      madeToOrder: z.boolean().optional(),
      status: z
        .enum([
          'available',
          'madeToOrder',
          'soldOut',
          'comingSoon',
          'limitedEdition',
          'new',
          'featured',
          'onSale',
        ])
        .optional(),
      size: z.string().optional(),
    })
    .optional(),
});

export type Product = {
  id: string;
  name: string;
  description?: string | null;
  images?: string[];
  price: {
    id: string;
    amount?: number;
    display_amount?: string;
  };
  metadata?: {
    status?:
      | 'madeToOrder'
      | 'available'
      | 'soldOut'
      | 'comingSoon'
      | 'limitedEdition'
      | 'new'
      | 'featured'
      | 'onSale';
    category?: string;
    stock?: number;
    madeToOrder?: boolean;
    materials?: string;
    dimensions?: string;
    size?: string;
  };
};

export type ProductWithPrice = Product & {
  price: {
    id: string;
    amount: number;
    display_amount: string;
  };
};

export const productListSchema = z.object({
  data: z.array(productSchema),
  has_more: z.boolean(),
  starting_after: z.string().optional(),
});

export type ProductListResponse = z.infer<typeof productListSchema>;
