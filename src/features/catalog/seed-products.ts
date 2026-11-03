import { catalogSchema } from './schema';
import type {
  DietaryTag,
  Product,
  ProductCategory,
  ProductGoal,
  ProductIngredient,
  ProductVariant,
} from './types';

type SeedVariant = {
  code: string;
  label: string;
  flavour: string;
  size: string;
  weightGrams: number;
  mrpPaise: number;
  pricePaise: number;
  stockAvailable: number;
  isDefault?: boolean;
};

type SeedProduct = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  summary: string;
  description: string;
  featuredRank: number;
  createdAt: string;
  goals: ProductGoal[];
  dietaryTags: DietaryTag[];
  ingredients: ProductIngredient[];
  usage: string;
  warnings: string[];
  color: string;
  variants: SeedVariant[];
};

function toVariant(productId: string, variant: SeedVariant): ProductVariant {
  return {
    id: `${productId}-${variant.code.toLocaleLowerCase('en-IN')}`,
    sku: `GR-${variant.code}`,
    label: variant.label,
    flavour: variant.flavour,
    size: variant.size,
    weightGrams: variant.weightGrams,
    mrp: { amountPaise: variant.mrpPaise, currency: 'INR' },
    price: { amountPaise: variant.pricePaise, currency: 'INR' },
    stockAvailable: variant.stockAvailable,
    isDefault: variant.isDefault ?? false,
  };
}

function toProduct(seed: SeedProduct): Product {
  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    brand:
      seed.id === 'plant-forge'
        ? 'GR Plant'
        : ['wellness', 'vitamins', 'healthy-snacks'].includes(seed.category)
          ? 'GR Daily'
          : 'GR Sport',
    category: seed.category,
    summary: seed.summary,
    description: seed.description,
    status: 'active',
    featuredRank: seed.featuredRank,
    createdAt: seed.createdAt,
    goals: seed.goals,
    dietaryTags: seed.dietaryTags,
    ingredients: seed.ingredients,
    media: [
      {
        id: `${seed.id}-front`,
        alt: `${seed.name} demo product pack`,
        backgroundColor: seed.color,
        sortOrder: 0,
      },
    ],
    variants: seed.variants.map((variant) => toVariant(seed.id, variant)),
    usage: seed.usage,
    warnings: seed.warnings,
    demoContent: true,
  };
}

const demoWarning =
  'Demo catalog content. Final label and claims require review before sale.';
const commonWarning =
  'Not for medicinal use. Do not exceed the recommended daily usage.';

const seedInput: SeedProduct[] = [
  {
    id: 'isolate-elite',
    slug: 'isolate-elite-whey',
    name: 'Isolate Elite Whey',
    category: 'protein',
    summary: 'Fast-mixing whey isolate with 27 g protein per demo serving.',
    description:
      'A lean, low-sugar protein built for training days and clean everyday nutrition.',
    featuredRank: 1,
    createdAt: '2026-10-21T00:00:00.000Z',
    goals: ['muscle-gain', 'recovery', 'weight-management'],
    dietaryTags: ['vegetarian', 'gluten-free'],
    ingredients: [{ name: 'Whey protein isolate', amount: '27 g' }],
    usage: 'Mix one demo scoop with 200–250 ml cold water after training.',
    warnings: [commonWarning, demoWarning],
    color: '#C7FF3D',
    variants: [
      {
        code: 'ISO-CHOC-1K',
        label: 'Dark Cocoa • 1 kg',
        flavour: 'Dark Cocoa',
        size: '1 kg',
        weightGrams: 1000,
        mrpPaise: 349900,
        pricePaise: 299900,
        stockAvailable: 28,
        isDefault: true,
      },
      {
        code: 'ISO-VAN-1K',
        label: 'Vanilla Malt • 1 kg',
        flavour: 'Vanilla Malt',
        size: '1 kg',
        weightGrams: 1000,
        mrpPaise: 349900,
        pricePaise: 299900,
        stockAvailable: 16,
      },
      {
        code: 'ISO-CHOC-2K',
        label: 'Dark Cocoa • 2 kg',
        flavour: 'Dark Cocoa',
        size: '2 kg',
        weightGrams: 2000,
        mrpPaise: 649900,
        pricePaise: 559900,
        stockAvailable: 7,
      },
    ],
  },
  {
    id: 'foundation-whey',
    slug: 'foundation-whey-blend',
    name: 'Foundation Whey Blend',
    category: 'protein',
    summary:
      'Everyday whey concentrate and isolate blend with a creamy finish.',
    description:
      'A versatile protein blend for customers beginning or maintaining a consistent routine.',
    featuredRank: 4,
    createdAt: '2026-10-10T00:00:00.000Z',
    goals: ['muscle-gain', 'recovery'],
    dietaryTags: ['vegetarian'],
    ingredients: [{ name: 'Whey protein blend', amount: '24 g' }],
    usage: 'Mix one demo scoop with water or milk once daily.',
    warnings: [commonWarning, demoWarning],
    color: '#F4F0E8',
    variants: [
      {
        code: 'FND-CHOC-1K',
        label: 'Milk Chocolate • 1 kg',
        flavour: 'Milk Chocolate',
        size: '1 kg',
        weightGrams: 1000,
        mrpPaise: 269900,
        pricePaise: 229900,
        stockAvailable: 42,
        isDefault: true,
      },
      {
        code: 'FND-COFFEE-1K',
        label: 'Cold Coffee • 1 kg',
        flavour: 'Cold Coffee',
        size: '1 kg',
        weightGrams: 1000,
        mrpPaise: 269900,
        pricePaise: 229900,
        stockAvailable: 31,
      },
    ],
  },
  {
    id: 'plant-forge',
    slug: 'plant-forge-protein',
    name: 'Plant Forge Protein',
    category: 'protein',
    summary: 'Pea and brown-rice protein blend with 24 g plant protein.',
    description:
      'A dairy-free protein option with a balanced amino acid profile and smooth texture.',
    featuredRank: 7,
    createdAt: '2026-09-28T00:00:00.000Z',
    goals: ['muscle-gain', 'recovery', 'everyday-wellness'],
    dietaryTags: ['vegan', 'gluten-free', 'lactose-free'],
    ingredients: [{ name: 'Pea and brown-rice protein blend', amount: '24 g' }],
    usage: 'Blend one demo scoop with 250 ml water or a plant beverage.',
    warnings: [commonWarning, demoWarning],
    color: '#8B5CF6',
    variants: [
      {
        code: 'PLT-COCOA-1K',
        label: 'Cocoa Almond • 1 kg',
        flavour: 'Cocoa Almond',
        size: '1 kg',
        weightGrams: 1000,
        mrpPaise: 299900,
        pricePaise: 259900,
        stockAvailable: 14,
        isDefault: true,
      },
    ],
  },
  {
    id: 'ignite-pre',
    slug: 'ignite-pre-workout',
    name: 'Ignite Pre-Workout',
    category: 'pre-workout',
    summary: 'A focused pre-training blend with caffeine and citrulline.',
    description:
      'Designed for experienced adult customers who want energy and focus before demanding sessions.',
    featuredRank: 2,
    createdAt: '2026-10-19T00:00:00.000Z',
    goals: ['energy', 'endurance'],
    dietaryTags: ['vegetarian', 'sugar-free'],
    ingredients: [
      { name: 'Citrulline malate' },
      { name: 'Caffeine', amount: 'Demo value' },
    ],
    usage: 'Mix one demo serving with water 20–30 minutes before training.',
    warnings: [
      'Contains caffeine. Not recommended for children or pregnant or nursing persons.',
      commonWarning,
      demoWarning,
    ],
    color: '#FF6B5F',
    variants: [
      {
        code: 'IGN-BERRY-300',
        label: 'Electric Berry • 300 g',
        flavour: 'Electric Berry',
        size: '300 g',
        weightGrams: 300,
        mrpPaise: 199900,
        pricePaise: 169900,
        stockAvailable: 22,
        isDefault: true,
      },
    ],
  },
  {
    id: 'clean-surge',
    slug: 'clean-surge-pump',
    name: 'Clean Surge Pump',
    category: 'pre-workout',
    summary:
      'Caffeine-free pump formula for late sessions and stimulant-sensitive routines.',
    description:
      'A stimulant-free pre-training option focused on hydration and training-session support.',
    featuredRank: 8,
    createdAt: '2026-09-23T00:00:00.000Z',
    goals: ['endurance', 'recovery'],
    dietaryTags: ['vegan', 'sugar-free'],
    ingredients: [{ name: 'L-citrulline' }, { name: 'Electrolyte blend' }],
    usage: 'Mix one demo serving with water before training.',
    warnings: [commonWarning, demoWarning],
    color: '#5B8CFF',
    variants: [
      {
        code: 'PUMP-LIME-300',
        label: 'Lime Charge • 300 g',
        flavour: 'Lime Charge',
        size: '300 g',
        weightGrams: 300,
        mrpPaise: 189900,
        pricePaise: 159900,
        stockAvailable: 0,
        isDefault: true,
      },
    ],
  },
  {
    id: 'recover-electrolytes',
    slug: 'recover-electrolytes',
    name: 'Recover+ Electrolytes',
    category: 'post-workout',
    summary:
      'Everyday electrolyte mix for hot training days and active routines.',
    description:
      'A light hydration blend that fits training, travel, and high-heat routines.',
    featuredRank: 5,
    createdAt: '2026-10-06T00:00:00.000Z',
    goals: ['recovery', 'endurance'],
    dietaryTags: ['vegan', 'gluten-free', 'sugar-free'],
    ingredients: [{ name: 'Sodium, potassium and magnesium blend' }],
    usage: 'Mix one demo sachet with 500 ml water.',
    warnings: [commonWarning, demoWarning],
    color: '#59D987',
    variants: [
      {
        code: 'REC-CITRUS-20',
        label: 'Citrus Salt • 20 sachets',
        flavour: 'Citrus Salt',
        size: '20 sachets',
        weightGrams: 120,
        mrpPaise: 99900,
        pricePaise: 84900,
        stockAvailable: 56,
        isDefault: true,
      },
    ],
  },
  {
    id: 'pure-creatine',
    slug: 'pure-creatine-monohydrate',
    name: 'Pure Creatine Monohydrate',
    category: 'post-workout',
    summary:
      'Unflavoured micronised creatine monohydrate for simple daily use.',
    description:
      'A single-ingredient format designed to make consistent creatine use straightforward.',
    featuredRank: 3,
    createdAt: '2026-10-16T00:00:00.000Z',
    goals: ['muscle-gain', 'recovery'],
    dietaryTags: ['vegan', 'gluten-free', 'sugar-free', 'lactose-free'],
    ingredients: [{ name: 'Creatine monohydrate', amount: 'Demo value' }],
    usage: 'Mix one demo serving into water or a preferred beverage.',
    warnings: [commonWarning, demoWarning],
    color: '#DCE4EA',
    variants: [
      {
        code: 'CRT-UNFL-250',
        label: 'Unflavoured • 250 g',
        flavour: 'Unflavoured',
        size: '250 g',
        weightGrams: 250,
        mrpPaise: 119900,
        pricePaise: 99900,
        stockAvailable: 64,
        isDefault: true,
      },
    ],
  },
  {
    id: 'daily-greens',
    slug: 'daily-greens',
    name: 'Daily Greens',
    category: 'wellness',
    summary:
      'Convenient greens, fruit, and prebiotic blend for everyday routines.',
    description:
      'A simple wellness blend intended to complement, not replace, a varied diet.',
    featuredRank: 6,
    createdAt: '2026-10-02T00:00:00.000Z',
    goals: ['everyday-wellness', 'immunity'],
    dietaryTags: ['vegan', 'gluten-free'],
    ingredients: [
      { name: 'Greens and fruit blend' },
      { name: 'Prebiotic fibre' },
    ],
    usage: 'Mix one demo serving with cold water once daily.',
    warnings: [
      'Not a substitute for a varied diet.',
      commonWarning,
      demoWarning,
    ],
    color: '#2BAA66',
    variants: [
      {
        code: 'GRN-MINT-300',
        label: 'Mint Lime • 300 g',
        flavour: 'Mint Lime',
        size: '300 g',
        weightGrams: 300,
        mrpPaise: 179900,
        pricePaise: 149900,
        stockAvailable: 19,
        isDefault: true,
      },
    ],
  },
  {
    id: 'omega-balance',
    slug: 'omega-balance',
    name: 'Omega Balance',
    category: 'wellness',
    summary:
      'Demo omega-3 softgels with transparent source and serving information.',
    description:
      'An everyday omega product concept with clear sourcing and usage presentation.',
    featuredRank: 10,
    createdAt: '2026-09-12T00:00:00.000Z',
    goals: ['everyday-wellness'],
    dietaryTags: ['gluten-free'],
    ingredients: [{ name: 'Fish oil concentrate' }],
    usage: 'Take the demo serving with a meal.',
    warnings: [
      'Contains fish. Consult a qualified professional if using blood-thinning medication.',
      commonWarning,
      demoWarning,
    ],
    color: '#4FC3F7',
    variants: [
      {
        code: 'OMG-60',
        label: '60 softgels',
        flavour: 'Neutral',
        size: '60 softgels',
        weightGrams: 90,
        mrpPaise: 109900,
        pricePaise: 89900,
        stockAvailable: 35,
        isDefault: true,
      },
    ],
  },
  {
    id: 'd3-k2',
    slug: 'vitamin-d3-k2',
    name: 'Vitamin D3 + K2',
    category: 'vitamins',
    summary: 'A clean demo D3 and K2 capsule concept for everyday wellness.',
    description:
      'A simple vitamin combination with a prominent label-review and dosage workflow.',
    featuredRank: 11,
    createdAt: '2026-09-05T00:00:00.000Z',
    goals: ['everyday-wellness', 'immunity'],
    dietaryTags: ['vegetarian', 'gluten-free', 'sugar-free'],
    ingredients: [{ name: 'Vitamin D3' }, { name: 'Vitamin K2' }],
    usage: 'Use only according to the final reviewed product label.',
    warnings: [
      'Consult a qualified professional before use when taking medication.',
      commonWarning,
      demoWarning,
    ],
    color: '#FFC857',
    variants: [
      {
        code: 'D3K2-60',
        label: '60 capsules',
        flavour: 'Neutral',
        size: '60 capsules',
        weightGrams: 45,
        mrpPaise: 79900,
        pricePaise: 64900,
        stockAvailable: 47,
        isDefault: true,
      },
    ],
  },
  {
    id: 'rapid-energy',
    slug: 'rapid-energy-gel',
    name: 'Rapid Energy Gel',
    category: 'energy',
    summary: 'Portable carbohydrate gel concept for long training sessions.',
    description:
      'An easy-carry demo energy format for endurance training and outdoor activity.',
    featuredRank: 9,
    createdAt: '2026-09-18T00:00:00.000Z',
    goals: ['energy', 'endurance'],
    dietaryTags: ['vegan', 'gluten-free'],
    ingredients: [{ name: 'Carbohydrate blend' }, { name: 'Electrolytes' }],
    usage: 'Use the final reviewed serving guidance during extended activity.',
    warnings: [commonWarning, demoWarning],
    color: '#FF8A3D',
    variants: [
      {
        code: 'GEL-MANGO-6',
        label: 'Mango Salt • Pack of 6',
        flavour: 'Mango Salt',
        size: '6 gels',
        weightGrams: 240,
        mrpPaise: 69900,
        pricePaise: 59900,
        stockAvailable: 24,
        isDefault: true,
      },
    ],
  },
  {
    id: 'protein-crunch',
    slug: 'protein-crunch-bites',
    name: 'Protein Crunch Bites',
    category: 'healthy-snacks',
    summary:
      'Crunchy baked protein snack concept for work, travel, and gym bags.',
    description:
      'A portion-friendly demo snack with protein and ingredient information upfront.',
    featuredRank: 12,
    createdAt: '2026-08-30T00:00:00.000Z',
    goals: ['weight-management', 'everyday-wellness'],
    dietaryTags: ['vegetarian'],
    ingredients: [{ name: 'Protein crisp blend' }, { name: 'Cocoa' }],
    usage: 'Enjoy as a snack within a balanced diet.',
    warnings: ['Contains milk and soy.', commonWarning, demoWarning],
    color: '#A76F4B',
    variants: [
      {
        code: 'SNK-COCOA-8',
        label: 'Cocoa Sea Salt • Pack of 8',
        flavour: 'Cocoa Sea Salt',
        size: '8 packs',
        weightGrams: 320,
        mrpPaise: 89900,
        pricePaise: 74900,
        stockAvailable: 29,
        isDefault: true,
      },
    ],
  },
];

export const seedProducts = catalogSchema.parse(seedInput.map(toProduct));
