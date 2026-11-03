import { makeProduct, makeVariant } from '../../../../test/factories/product';
import { createLocalCatalogRepository } from '../local-catalog-repository';
import { catalogSchema, productSchema } from '../schema';

describe('local catalog repository', () => {
  it('lists only active products', async () => {
    const repository = createLocalCatalogRepository([
      makeProduct({ id: 'active', slug: 'active', status: 'active' }),
      makeProduct({ id: 'draft', slug: 'draft', status: 'draft' }),
    ]);

    const result = await repository.list({}, 'featured');

    expect(result.items.map((product) => product.id)).toEqual(['active']);
    expect(result.total).toBe(1);
  });

  it('combines category and goal filters', async () => {
    const repository = createLocalCatalogRepository([
      makeProduct({
        id: 'whey',
        slug: 'whey',
        category: 'protein',
        goals: ['muscle-gain', 'recovery'],
      }),
      makeProduct({
        id: 'creatine',
        slug: 'creatine',
        category: 'post-workout',
        goals: ['muscle-gain', 'recovery'],
      }),
      makeProduct({
        id: 'lean-protein',
        slug: 'lean-protein',
        category: 'protein',
        goals: ['weight-management'],
      }),
    ]);

    const result = await repository.list(
      { category: 'protein', goals: ['muscle-gain'] },
      'featured',
    );

    expect(result.items.map((product) => product.id)).toEqual(['whey']);
  });

  it('searches without case or whitespace sensitivity', async () => {
    const repository = createLocalCatalogRepository([
      makeProduct({
        id: 'whey-prime',
        slug: 'whey-prime',
        name: 'Whey Prime Isolate',
      }),
      makeProduct({
        id: 'daily-greens',
        slug: 'daily-greens',
        name: 'Daily Greens',
      }),
    ]);

    const result = await repository.list(
      { search: '  WHEY    prime  ' },
      'featured',
    );

    expect(result.items.map((product) => product.id)).toEqual(['whey-prime']);
  });

  it('sorts by the cheapest in-stock variant and leaves sold-out products last', async () => {
    const repository = createLocalCatalogRepository([
      makeProduct({
        id: 'premium',
        slug: 'premium',
        variants: [
          makeVariant({
            id: 'premium-sold',
            sku: 'PREM-SOLD',
            pricePaise: 50000,
            stockAvailable: 0,
          }),
          makeVariant({
            id: 'premium-live',
            sku: 'PREM-LIVE',
            pricePaise: 200000,
            stockAvailable: 5,
          }),
        ],
      }),
      makeProduct({
        id: 'value',
        slug: 'value',
        variants: [
          makeVariant({
            id: 'value-live',
            sku: 'VALUE-LIVE',
            pricePaise: 150000,
            stockAvailable: 5,
          }),
        ],
      }),
      makeProduct({
        id: 'sold-out',
        slug: 'sold-out',
        variants: [
          makeVariant({
            id: 'sold-out-1',
            sku: 'SOLD-1',
            pricePaise: 10000,
            stockAvailable: 0,
          }),
        ],
      }),
    ]);

    const result = await repository.list({}, 'price-asc');

    expect(result.items.map((product) => product.id)).toEqual([
      'value',
      'premium',
      'sold-out',
    ]);
  });

  it('paginates in a deterministic featured order', async () => {
    const products = [1, 2, 3, 4, 5].map((rank) =>
      makeProduct({
        id: `product-${rank}`,
        slug: `product-${rank}`,
        featuredRank: rank,
      }),
    );
    const repository = createLocalCatalogRepository(products);

    const result = await repository.list({ page: 2, pageSize: 2 }, 'featured');

    expect(result.items.map((product) => product.id)).toEqual([
      'product-3',
      'product-4',
    ]);
    expect(result).toMatchObject({
      total: 5,
      page: 2,
      pageSize: 2,
      totalPages: 3,
    });
  });

  it('returns null for an unknown slug', async () => {
    const repository = createLocalCatalogRepository([
      makeProduct({ id: 'known', slug: 'known' }),
    ]);

    await expect(repository.getBySlug('missing')).resolves.toBeNull();
  });
});

describe('catalog schemas', () => {
  it('rejects negative prices', () => {
    const product = makeProduct({
      variants: [makeVariant({ pricePaise: -1 })],
    });

    expect(productSchema.safeParse(product).success).toBe(false);
  });

  it('rejects duplicate variant SKUs across the catalog', () => {
    const first = makeProduct({
      id: 'first',
      slug: 'first',
      variants: [makeVariant({ id: 'first-v', sku: 'DUPLICATE-SKU' })],
    });
    const second = makeProduct({
      id: 'second',
      slug: 'second',
      variants: [makeVariant({ id: 'second-v', sku: 'DUPLICATE-SKU' })],
    });

    expect(catalogSchema.safeParse([first, second]).success).toBe(false);
  });
});
