import {
  render,
  screen,
  userEvent,
  waitFor,
  act,
} from '@testing-library/react-native';

import { localCatalogRepository } from '../local-catalog-repository';
import { ShopScreen } from '../ShopScreen';

describe('ShopScreen', () => {
  it('combines search and category filters while updating the result count', async () => {
    const user = userEvent.setup();
    await render(<ShopScreen repository={localCatalogRepository} />);

    expect(await screen.findByText('12 products')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Filter by Protein' }));
    await user.type(screen.getByLabelText('Search supplements'), 'plant');

    expect(await screen.findByText('1 product')).toBeOnTheScreen();
    expect(screen.getByText('Plant Forge Protein')).toBeOnTheScreen();
    expect(screen.queryByText('Daily Greens')).not.toBeOnTheScreen();
  });

  it('emits serializable filters for route query state', async () => {
    const onFiltersChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <ShopScreen
        onFiltersChange={onFiltersChange}
        repository={localCatalogRepository}
      />,
    );

    await screen.findByText('12 products');
    await user.press(
      screen.getByRole('button', { name: 'Filter by Pre-workout' }),
    );

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenLastCalledWith({
        category: 'pre-workout',
      });
    });
  });

  it('sorts visible products by in-stock price', async () => {
    const user = userEvent.setup();
    await render(<ShopScreen repository={localCatalogRepository} />);

    await screen.findByText('12 products');
    await user.press(
      screen.getByRole('button', { name: 'Price: low to high' }),
    );

    await waitFor(() => {
      const productLinks = screen.getAllByRole('link', { name: /^View / });
      expect(productLinks[0]).toHaveAccessibleName('View Rapid Energy Gel');
    });
  });

  it('labels sold-out products', async () => {
    await render(<ShopScreen repository={localCatalogRepository} />);

    expect(await screen.findByText('Sold out')).toBeOnTheScreen();
  });

  it('keeps active filters visible in an empty state and can clear them', async () => {
    const user = userEvent.setup();
    await render(
      <ShopScreen
        initialFilters={{ category: 'protein', search: 'not-a-real-product' }}
        repository={localCatalogRepository}
      />,
    );

    expect(
      await screen.findByText('No products match those filters'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Remove Protein filter' }),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(await screen.findByText('12 products')).toBeOnTheScreen();
  });

  it('replaces visible results when route filters change on the mounted screen', async () => {
    const view = await render(
      <ShopScreen
        initialFilters={{ category: 'protein' }}
        repository={localCatalogRepository}
      />,
    );

    expect(await screen.findByText('3 products')).toBeOnTheScreen();
    expect(screen.getByText('Isolate Elite Whey')).toBeOnTheScreen();

    await act(async () => {
      view.rerender(
        <ShopScreen
          initialFilters={{ category: 'pre-workout' }}
          repository={localCatalogRepository}
        />,
      );
    });

    expect(await screen.findByText('2 products')).toBeOnTheScreen();
    expect(screen.getByText('Ignite Pre-Workout')).toBeOnTheScreen();
    expect(screen.queryByText('Isolate Elite Whey')).not.toBeOnTheScreen();
  });
});
