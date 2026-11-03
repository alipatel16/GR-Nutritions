import { createLocalCatalogRepository } from '../local-catalog-repository';
import { makeProduct } from '../../../../test/factories/product';

it('combines brand, category and search without including another brand', async () => {
  const repository = createLocalCatalogRepository([
    makeProduct({ id: 'one', brand: 'GR Sport' }),
    makeProduct({
      id: 'two',
      brand: 'GR Daily',
      variants: [{ ...makeProduct().variants[0], id: 'second', sku: 'SECOND' }],
    }),
  ]);
  const result = await repository.list({
    brand: 'GR Daily',
    category: 'protein',
    search: 'protein',
  });
  expect(result.items.map((p) => p.id)).toEqual(['two']);
});
