import type { CatalogRepository } from './catalog-repository';
import { catalogSchema } from './schema';
import { seedProducts } from './seed-products';
import type {
  CatalogFilters,
  CatalogResult,
  CatalogSort,
  Product,
} from './types';

function normalizeSearch(value: string): string[] {
  return value.trim().toLocaleLowerCase('en-IN').split(/\s+/).filter(Boolean);
}

function productSearchText(product: Product): string {
  return [
    product.name,
    product.brand,
    product.summary,
    product.category,
    ...product.goals,
    ...product.ingredients.map((ingredient) => ingredient.name),
  ]
    .join(' ')
    .toLocaleLowerCase('en-IN');
}

function cheapestInStockPrice(product: Product): number | null {
  const prices = product.variants
    .filter((variant) => variant.stockAvailable > 0)
    .map((variant) => variant.price.amountPaise);

  return prices.length > 0 ? Math.min(...prices) : null;
}

function compareProducts(sort: CatalogSort) {
  return (left: Product, right: Product): number => {
    if (sort === 'newest') {
      const dateDifference =
        Date.parse(right.createdAt) - Date.parse(left.createdAt);
      if (dateDifference !== 0) return dateDifference;
    }

    if (sort === 'price-asc' || sort === 'price-desc') {
      const leftPrice = cheapestInStockPrice(left);
      const rightPrice = cheapestInStockPrice(right);

      if (leftPrice === null && rightPrice !== null) return 1;
      if (leftPrice !== null && rightPrice === null) return -1;
      if (
        leftPrice !== null &&
        rightPrice !== null &&
        leftPrice !== rightPrice
      ) {
        return sort === 'price-asc'
          ? leftPrice - rightPrice
          : rightPrice - leftPrice;
      }
    }

    if (sort === 'featured' && left.featuredRank !== right.featuredRank) {
      return left.featuredRank - right.featuredRank;
    }

    const nameDifference = left.name.localeCompare(right.name, 'en-IN');
    return nameDifference !== 0
      ? nameDifference
      : left.id.localeCompare(right.id, 'en-IN');
  };
}

export function createLocalCatalogRepository(
  inputProducts: readonly Product[],
): CatalogRepository {
  const products = catalogSchema.parse(inputProducts);

  return {
    async list(
      filters: CatalogFilters = {},
      sort: CatalogSort = 'featured',
    ): Promise<CatalogResult> {
      const page = Math.max(1, Math.trunc(filters.page ?? 1));
      const pageSize = Math.max(1, Math.trunc(filters.pageSize ?? 12));
      const searchTokens = filters.search
        ? normalizeSearch(filters.search)
        : [];

      const filtered = products
        .filter((product) => product.status === 'active')
        .filter(
          (product) =>
            !filters.category || product.category === filters.category,
        )
        .filter((product) => !filters.brand || product.brand === filters.brand)
        .filter(
          (product) =>
            !filters.goals?.length ||
            filters.goals.some((goal) => product.goals.includes(goal)),
        )
        .filter((product) => {
          if (searchTokens.length === 0) return true;
          const haystack = productSearchText(product);
          return searchTokens.every((token) => haystack.includes(token));
        })
        .sort(compareProducts(sort));

      const total = filtered.length;
      const start = (page - 1) * pageSize;

      return {
        items: filtered.slice(start, start + pageSize),
        total,
        page,
        pageSize,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      };
    },

    async getBySlug(slug: string): Promise<Product | null> {
      return (
        products.find(
          (product) => product.status === 'active' && product.slug === slug,
        ) ?? null
      );
    },
  };
}

export const localCatalogRepository =
  createLocalCatalogRepository(seedProducts);
