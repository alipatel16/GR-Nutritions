import type {
  CatalogFilters,
  CatalogResult,
  CatalogSort,
  Product,
} from './types';

export interface CatalogRepository {
  list(filters?: CatalogFilters, sort?: CatalogSort): Promise<CatalogResult>;
  getBySlug(slug: string): Promise<Product | null>;
}
