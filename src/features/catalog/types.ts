export const productCategoryValues = [
  'protein',
  'pre-workout',
  'post-workout',
  'wellness',
  'energy',
  'vitamins',
  'healthy-snacks',
] as const;

export const productGoalValues = [
  'muscle-gain',
  'recovery',
  'energy',
  'endurance',
  'weight-management',
  'everyday-wellness',
  'immunity',
  'sleep',
] as const;

export const dietaryTagValues = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'sugar-free',
  'lactose-free',
] as const;

export type ProductCategory = (typeof productCategoryValues)[number];
export type ProductGoal = (typeof productGoalValues)[number];
export type DietaryTag = (typeof dietaryTagValues)[number];
export type ProductStatus = 'active' | 'draft' | 'archived';

export type Money = {
  amountPaise: number;
  currency: 'INR';
};

export type ProductVariant = {
  id: string;
  sku: string;
  label: string;
  flavour: string;
  size: string;
  weightGrams: number;
  shipping?: {
    weightGrams: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };
  mrp: Money;
  price: Money;
  stockAvailable: number;
  isDefault: boolean;
};

export type ProductIngredient = {
  name: string;
  amount?: string;
  note?: string;
};

export type ProductMedia = {
  id: string;
  alt: string;
  backgroundColor: string;
  uri?: string;
  storagePath?: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: ProductCategory;
  summary: string;
  description: string;
  status: ProductStatus;
  featuredRank: number;
  createdAt: string;
  updatedAt?: string;
  goals: ProductGoal[];
  dietaryTags: DietaryTag[];
  ingredients: ProductIngredient[];
  media: ProductMedia[];
  variants: ProductVariant[];
  usage: string;
  warnings: string[];
  demoContent: boolean;
};

export type CatalogFilters = {
  brand?: string;
  category?: ProductCategory;
  goals?: ProductGoal[];
  search?: string;
  page?: number;
  pageSize?: number;
};

export type CatalogSort = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export type CatalogResult = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
