import { z } from 'zod';

import {
  dietaryTagValues,
  productCategoryValues,
  productGoalValues,
} from './types';

export const moneySchema = z.object({
  amountPaise: z.number().int().nonnegative(),
  currency: z.literal('INR'),
});

export const productVariantSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  label: z.string().min(1),
  flavour: z.string().min(1),
  size: z.string().min(1),
  weightGrams: z.number().int().positive(),
  shipping: z.object({
    weightGrams: z.number().int().positive().max(100000),
    lengthCm: z.number().gt(0.5).max(200).optional(),
    widthCm: z.number().gt(0.5).max(200).optional(),
    heightCm: z.number().gt(0.5).max(200).optional(),
  }).optional(),
  mrp: moneySchema,
  price: moneySchema,
  stockAvailable: z.number().int().nonnegative(),
  isDefault: z.boolean(),
});

export const productSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.enum(productCategoryValues),
  summary: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['active', 'draft', 'archived']),
  featuredRank: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
  goals: z.array(z.enum(productGoalValues)),
  dietaryTags: z.array(z.enum(dietaryTagValues)),
  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      amount: z.string().min(1).optional(),
      note: z.string().min(1).optional(),
    }),
  ),
  media: z.array(
    z.object({
      id: z.string().min(1),
      alt: z.string().min(1),
      backgroundColor: z.string().min(1),
      uri: z.string().min(1).optional(),
      storagePath: z.string().min(1).optional(),
      sortOrder: z.number().int().nonnegative(),
    }),
  ),
  variants: z.array(productVariantSchema).min(1),
  usage: z.string().min(1),
  warnings: z.array(z.string().min(1)).min(1),
  demoContent: z.boolean(),
});

export const catalogSchema = z
  .array(productSchema)
  .superRefine((products, context) => {
    const seenSkus = new Set<string>();

    for (const product of products) {
      for (const variant of product.variants) {
        const normalizedSku = variant.sku.trim().toUpperCase();

        if (seenSkus.has(normalizedSku)) {
          context.addIssue({
            code: 'custom',
            message: `Duplicate variant SKU: ${variant.sku}`,
          });
        }

        seenSkus.add(normalizedSku);
      }
    }
  });
