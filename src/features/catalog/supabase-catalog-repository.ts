import { requireSupabase } from '@/lib/supabase';
import { resolveProductMedia } from '@/lib/store-api';
import { createLocalCatalogRepository, localCatalogRepository } from './local-catalog-repository';
import { catalogSchema } from './schema';
import type { CatalogRepository } from './catalog-repository';
import type { Product } from './types';

// Starter pack shots use the storefront CDN so they don't consume Supabase
// image bandwidth. A photo uploaded in admin takes precedence.
const starterPhotos = new Map([
  ['on-gold-standard-whey-double-rich-chocolate', 'on-v1/double-rich-chocolate'],
  ['on-gold-standard-whey-vanilla-ice-cream', 'on-v1/vanilla-ice-cream'],
  ['on-gold-standard-whey-alphonso-mango', 'on-v1/alphonso-mango'],
  ['on-gold-standard-whey-unflavoured', 'on-v1/unflavoured'],
  ['isopure-low-carb-dutch-chocolate', 'isopure-v1/chocolate'],
  ['isopure-zero-carb-unflavoured', 'isopure-v1/unflavoured'],
  ['muscleblaze-biozyme-whey-pr', 'muscleblaze-v1/whey'],
  ['muscleblaze-creamp-creatine', 'muscleblaze-v1/creatine'],
  ['muscleblaze-wrathx-fruit-fury', 'muscleblaze-v1/wrathx'],
  ['muscleblaze-bcaa-gold-watermelon', 'muscleblaze-v1/bcaa'],
  ['muscleblaze-biozyme-multivitamin', 'muscleblaze-v1/vitamins'],
  ['muscleblaze-high-protein-peanut-butter', 'muscleblaze-v1/peanut'],
  ['muscletech-nitrotech-whey', 'muscletech-v1/whey'],
  ['muscletech-platinum-creatine', 'muscletech-v1/creatine'],
  ['muscletech-vapor-x5', 'muscletech-v1/pre'],
  ['one-science-advanced-bcaa-grapes', 'osn-v1/bcaa'],
  ['rule-one-whey-isolate-chocolate-fudge', 'rule-one-v1/isolate'],
  ['transformium-ultra-creatine', 'transformium-v1/creatine'],
]);
function withStarterPhoto(product: Product): Product {
  const photo = starterPhotos.get(product.id);
  if (!photo || product.media.length) return product;
  return { ...product, media: [{
    id: `${product.id}-pack-shot`,
    alt: `${product.name} representative pack shot`,
    backgroundColor: '#ffffff',
    uri: `https://grnutritions.web.app/catalog/${photo}.webp`,
    sortOrder: 0,
  }] };
}

async function load() {
  const { data, error } = await requireSupabase().rpc('catalog_products');
  if (error) throw new Error('The catalog is unavailable. Please retry.');
  return (await resolveProductMedia(catalogSchema.parse(data))).map(withStarterPhoto);
}
export const supabaseCatalogRepository: CatalogRepository = {
  async list(filters, sort) { return createLocalCatalogRepository(await load()).list(filters, sort); },
  async getBySlug(slug) { return (await load()).find(p => p.slug === slug) ?? null; },
};
// A failing live backend must never silently switch to sample inventory.
export const catalogRepository = process.env.EXPO_PUBLIC_CATALOG_MODE === 'live' ? supabaseCatalogRepository : localCatalogRepository;
export const isSampleCatalog = process.env.EXPO_PUBLIC_CATALOG_MODE !== 'live';
