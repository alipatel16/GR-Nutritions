import { z } from 'zod';
const identifier = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const money = z.object({
  amountPaise: z.number().int().positive().max(100000000),
  currency: z.literal('INR'),
});
const variant = z
  .object({
    id: identifier,
    sku: z.string().trim().min(1).max(100),
    label: z.string().min(1).max(150),
    flavour: z.string().min(1),
    size: z.string().min(1),
    weightGrams: z.number().int().positive(),
    shipping: z.object({
      weightGrams: z.number().int().positive().max(100000),
      lengthCm: z.number().gt(0.5).max(200),
      widthCm: z.number().gt(0.5).max(200),
      heightCm: z.number().gt(0.5).max(200),
    }).optional(),
    price: money,
    mrp: money,
    stockAvailable: z.number().int().min(0).max(1000000),
    isDefault: z.boolean(),
  })
  .refine(
    (v) => v.price.amountPaise <= v.mrp.amountPaise,
    'Price cannot exceed MRP',
  );
export const productInputSchema = z
  .object({
    id: identifier,
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: z.string().min(2).max(180),
    brand: z.string().min(1).max(100),
    category: z.enum([
      'protein',
      'pre-workout',
      'post-workout',
      'wellness',
      'energy',
      'vitamins',
      'healthy-snacks',
    ]),
    status: z.enum(['draft', 'active', 'archived']),
    summary: z.string().min(1).max(500),
    description: z.string().min(1).max(10000),
    featuredRank: z.number().int().nonnegative(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime({ offset: true }).optional(),
    goals: z.array(
      z.enum([
        'muscle-gain',
        'recovery',
        'energy',
        'endurance',
        'weight-management',
        'everyday-wellness',
        'immunity',
        'sleep',
      ]),
    ),
    dietaryTags: z.array(
      z.enum([
        'vegetarian',
        'vegan',
        'gluten-free',
        'sugar-free',
        'lactose-free',
      ]),
    ),
    ingredients: z.array(
      z.object({
        name: z.string().min(1),
        amount: z.string().optional(),
        note: z.string().optional(),
      }),
    ),
    media: z.array(
      z.object({
        id: identifier,
        alt: z.string().min(1),
        backgroundColor: z.string(),
        uri: z.url().optional(),
        storagePath: z.string().min(1).max(300).optional(),
        sortOrder: z.number().int().nonnegative(),
      }),
    ),
    variants: z.array(variant).min(1).max(30),
    usage: z.string().min(1),
    warnings: z.array(z.string().min(1)).min(1),
    demoContent: z.boolean(),
  })
  .superRefine((p, ctx) => {
    if (
      new Set(p.variants.map((v) => v.sku.trim().toUpperCase())).size !==
      p.variants.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate SKU in this product',
      });
    if (new Set(p.variants.map((v) => v.id)).size !== p.variants.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate variant ID' });
  });
export const checkoutItemsSchema = z
  .array(
    z.object({
      productId: identifier,
      variantId: identifier,
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .min(1)
  .max(20)
  .refine(
    (items) => new Set(items.map((i) => i.variantId)).size === items.length,
    'Duplicate product option',
  );
export function quoteCatalog(input, products) {
  const items = checkoutItemsSchema.parse(input);
  const lines = items.map((i) => {
    const p = products.find(
      (p) => p.id === i.productId && p.status === 'active',
    );
    const v = p?.variants.find((v) => v.id === i.variantId);
    if (!v || v.stockAvailable < i.quantity)
      throw new Error('A product is unavailable or has insufficient stock');
    if (!Number.isSafeInteger(v.price.amountPaise) || v.price.amountPaise <= 0)
      throw new Error('Invalid catalog price');
    return {
      productId: p.id,
      variantId: v.id,
      productName: p.name,
      variantLabel: v.label,
      quantity: i.quantity,
      unitPricePaise: v.price.amountPaise,
    };
  });
  return {
    currency: 'INR',
    items: lines,
    totalPaise: lines.reduce(
      (sum, l) => sum + l.quantity * l.unitPricePaise,
      0,
    ),
  };
}
