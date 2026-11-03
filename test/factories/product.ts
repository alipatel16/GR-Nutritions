import type { Product, ProductVariant } from '@/features/catalog/types';

type VariantOverrides = Partial<Omit<ProductVariant, 'price' | 'mrp'>> & {
  pricePaise?: number;
  mrpPaise?: number;
};

export function makeVariant(overrides: VariantOverrides = {}): ProductVariant {
  const id = overrides.id ?? 'product-variant';
  const pricePaise = overrides.pricePaise ?? 149900;

  return {
    id,
    sku: overrides.sku ?? id.toUpperCase(),
    label: overrides.label ?? 'Chocolate • 1 kg',
    flavour: overrides.flavour ?? 'Chocolate',
    size: overrides.size ?? '1 kg',
    weightGrams: overrides.weightGrams ?? 1000,
    mrp: {
      amountPaise: overrides.mrpPaise ?? pricePaise + 20000,
      currency: 'INR',
    },
    price: { amountPaise: pricePaise, currency: 'INR' },
    stockAvailable: overrides.stockAvailable ?? 10,
    isDefault: overrides.isDefault ?? true,
  };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? 'product';

  return {
    id,
    slug: overrides.slug ?? id,
    name: overrides.name ?? 'Test Performance Protein',
    brand: overrides.brand ?? 'GR Nutritions',
    category: overrides.category ?? 'protein',
    summary: overrides.summary ?? 'A test product for catalog behavior.',
    description:
      overrides.description ?? 'Demo product description for automated tests.',
    status: overrides.status ?? 'active',
    featuredRank: overrides.featuredRank ?? 1,
    createdAt: overrides.createdAt ?? '2026-10-01T00:00:00.000Z',
    goals: overrides.goals ?? ['muscle-gain'],
    dietaryTags: overrides.dietaryTags ?? ['vegetarian'],
    ingredients: overrides.ingredients ?? [
      { name: 'Protein blend', amount: '24 g' },
    ],
    media: overrides.media ?? [
      {
        id: `${id}-media`,
        alt: 'Demo supplement container',
        backgroundColor: '#C7FF3D',
        sortOrder: 0,
      },
    ],
    variants: overrides.variants ?? [
      makeVariant({ id: `${id}-variant`, sku: `${id.toUpperCase()}-SKU` }),
    ],
    usage: overrides.usage ?? 'Mix one demo serving with water.',
    warnings: overrides.warnings ?? ['Demo content. Not for medicinal use.'],
    demoContent: overrides.demoContent ?? true,
  };
}
