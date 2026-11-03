import { render, screen } from '@testing-library/react-native';

import { localCatalogRepository } from '@/features/catalog/local-catalog-repository';

import { HomeScreen } from '../HomeScreen';

describe('HomeScreen', () => {
  it('connects goal discovery, featured products, and the guided advisor', async () => {
    await render(<HomeScreen repository={localCatalogRepository} />);

    expect(
      await screen.findByRole('link', { name: 'Shop muscle gain' }),
    ).toBeOnTheScreen();
    expect((await screen.findAllByText('Isolate Elite Whey')).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: 'View Isolate Elite Whey' }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('link', { name: 'Start guided advisor' }),
    ).toBeOnTheScreen();
  });

  it('offers distinct category routes and a complete merchandising journey', async () => {
    await render(<HomeScreen repository={localCatalogRepository} />);

    expect(screen.getByRole('link', { name: 'Shop protein' })).toHaveProp(
      'href',
      '/shop?category=protein',
    );
    expect(screen.getByRole('link', { name: 'Shop pre workout' })).toHaveProp(
      'href',
      '/shop?category=pre-workout',
    );
    expect(await screen.findByText('Bestsellers')).toBeOnTheScreen();
    expect(screen.getByText('Top deals')).toBeOnTheScreen();
    expect(screen.getByText('Protein powders')).toBeOnTheScreen();
    expect(screen.getByText('Performance & training')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Everyday wellness' })).toBeOnTheScreen();
    expect(screen.getByText('New to the shelf')).toBeOnTheScreen();
    expect(screen.getByText('What’s your goal?')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Browse all brands' })).toBeOnTheScreen();
    expect(screen.getByText('SHOP')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Footer account' })).toBeOnTheScreen();
  });
});
