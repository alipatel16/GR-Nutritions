import { render, screen, userEvent } from '@testing-library/react-native';

import * as breakpoints from '@/theme/use-breakpoint';
import { useCartStore } from '@/features/cart/cart-store';

import { makeProduct, makeVariant } from '../../../../test/factories/product';
import { createLocalCatalogRepository } from '../local-catalog-repository';
import {
  ProductDetailRouteContent,
  ProductDetailScreen,
} from '../ProductDetailScreen';

const product = makeProduct({
  id: 'detail-product',
  slug: 'detail-product',
  name: 'Detail Protein',
  usage: 'Mix one scoop with 250 ml cold water.',
  warnings: ['Contains milk.', 'Not for medicinal use.'],
  media: [
    {
      id: 'front',
      alt: 'Detail Protein front pack',
      backgroundColor: '#C7FF3D',
      sortOrder: 0,
    },
    {
      id: 'back',
      alt: 'Detail Protein nutrition panel',
      backgroundColor: '#8B5CF6',
      sortOrder: 1,
    },
  ],
  variants: [
    makeVariant({
      id: 'sold-out-small',
      sku: 'DETAIL-SOLD',
      label: 'Cocoa • 500 g',
      size: '500 g',
      pricePaise: 80000,
      mrpPaise: 100000,
      stockAvailable: 0,
      isDefault: true,
    }),
    makeVariant({
      id: 'in-stock-1kg',
      sku: 'DETAIL-1K',
      label: 'Cocoa • 1 kg',
      size: '1 kg',
      pricePaise: 100000,
      mrpPaise: 120000,
      stockAvailable: 8,
      isDefault: false,
    }),
    makeVariant({
      id: 'in-stock-2kg',
      sku: 'DETAIL-2K',
      label: 'Cocoa • 2 kg',
      size: '2 kg',
      pricePaise: 200000,
      mrpPaise: 230000,
      stockAvailable: 3,
      isDefault: false,
    }),
  ],
});

describe('ProductDetailScreen', () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => {
    useCartStore.setState({ cart: { lines: [] }, lastError: null });
  });

  it('lets stacked product sections use their natural content height without growing or shrinking', async () => {
    jest.spyOn(breakpoints, 'useBreakpoint').mockReturnValue('mobile');
    await render(<ProductDetailScreen product={product} />);
    for (const id of [
      'product-gallery',
      'product-purchase',
      'product-shopping-note-0',
      'product-shopping-note-1',
      'product-shopping-note-2',
      'product-facts-description',
      'product-facts-label-notes',
    ]) {
      expect(screen.getByTestId(id)).toHaveStyle({
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: 'auto',
        width: '100%',
      });
    }
  });

  it('keeps desktop product columns proportional rather than applying stacked height rules', async () => {
    jest.spyOn(breakpoints, 'useBreakpoint').mockReturnValue('desktop');
    await render(<ProductDetailScreen product={product} />);
    expect(screen.getByTestId('product-gallery')).toHaveStyle({
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 0,
    });
    expect(screen.getByTestId('product-purchase')).toHaveStyle({
      flexGrow: 0.9,
      flexShrink: 1,
      flexBasis: 0,
    });
  });

  it('shows live brand and inventory without sample catalog wording', async () => {
    await render(
      <ProductDetailScreen
        product={{ ...product, brand: 'Atlas Nutrition', demoContent: false }}
      />,
    );

    expect(screen.getByText('Atlas Nutrition')).toBeOnTheScreen();
    expect(screen.getByText('8 units available')).toBeOnTheScreen();
    expect(
      screen.queryByText(/demo catalog|demo inventory|sample product/i),
    ).toBeNull();
  });

  it('identifies sample products and their sample inventory', async () => {
    await render(<ProductDetailScreen product={product} />);

    expect(screen.getByText('Sample product')).toBeOnTheScreen();
    expect(screen.getByText('8 units in sample inventory')).toBeOnTheScreen();
  });

  it('keeps an uploaded photo uncropped and uses its descriptive label', async () => {
    await render(
      <ProductDetailScreen
        product={{
          ...product,
          demoContent: false,
          media: [
            {
              id: 'upload',
              alt: 'Atlas protein front label',
              backgroundColor: '#FFFFFF',
              uri: 'https://example.com/atlas-front.jpg',
              storagePath: 'atlas/front.jpg',
              sortOrder: 0,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByLabelText('Atlas protein front label'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('product-photo').props.contentFit).toBe(
      'contain',
    );
    expect(
      screen.queryByText(/sample imagery|demo product visual/i),
    ).toBeNull();
  });

  it('does not substitute a sample pack when a live product has no photo', async () => {
    await render(
      <ProductDetailScreen
        product={{ ...product, demoContent: false, media: [] }}
      />,
    );

    expect(screen.getByText('Product photo coming soon')).toBeOnTheScreen();
    expect(screen.queryByTestId('product-photo')).toBeNull();
    expect(
      screen.queryByText(/demo product visual|sample imagery/i),
    ).toBeNull();
  });

  it('adds the selected variant to the actual bag and clears feedback on selection', async () => {
    const user = userEvent.setup();
    await render(<ProductDetailScreen product={product} />);

    await user.press(
      screen.getByRole('button', { name: 'Select Cocoa • 2 kg' }),
    );
    await user.press(screen.getByRole('button', { name: 'Add to cart' }));
    expect(useCartStore.getState().cart.lines).toEqual([
      expect.objectContaining({
        variantId: 'in-stock-2kg',
        quantity: 1,
        unitPricePaise: 200000,
      }),
    ]);
    expect(screen.getByText(/Added to your bag/)).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Select Cocoa • 1 kg' }),
    );
    expect(screen.queryByText(/Added to your bag/)).toBeNull();
  });

  it('selects the first in-stock variant and updates price when selection changes', async () => {
    const user = userEvent.setup();
    await render(
      <ProductDetailScreen onAddToCart={() => undefined} product={product} />,
    );

    expect(
      screen.getByRole('button', { name: 'Select Cocoa • 1 kg' }),
    ).toBeSelected();
    expect(screen.getByText('₹1,000')).toBeOnTheScreen();
    expect(screen.getByText('MRP ₹1,200')).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Select Cocoa • 2 kg' }),
    );

    expect(screen.getByText('₹2,000')).toBeOnTheScreen();
    expect(screen.getByText('MRP ₹2,300')).toBeOnTheScreen();
  });

  it('prevents adding an out-of-stock variant', async () => {
    const user = userEvent.setup();
    await render(
      <ProductDetailScreen onAddToCart={() => undefined} product={product} />,
    );

    await user.press(
      screen.getByRole('button', { name: 'Select Cocoa • 500 g' }),
    );

    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
  });

  it('offers accessible gallery controls and shows usage and warnings', async () => {
    const user = userEvent.setup();
    await render(
      <ProductDetailScreen onAddToCart={() => undefined} product={product} />,
    );

    expect(
      screen.getByLabelText('Detail Protein front pack'),
    ).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Next product image' }),
    );
    expect(
      screen.getByLabelText('Detail Protein nutrition panel'),
    ).toBeOnTheScreen();
    expect(screen.getByText('How to use')).toBeOnTheScreen();
    expect(
      screen.getByText('Mix one scoop with 250 ml cold water.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Contains milk.')).toBeOnTheScreen();
  });
});

describe('ProductDetailRouteContent', () => {
  it('recovers from a failed live product lookup', async () => {
    const repository = {
      list: jest.fn(),
      getBySlug: jest.fn().mockRejectedValue(new Error('Offline')),
    };
    await render(
      <ProductDetailRouteContent
        repository={repository}
        slug="detail-product"
      />,
    );
    expect(
      await screen.findByText('This product could not load'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });
  it.each(['', 'missing'])(
    'renders a helpful empty state for slug %p',
    async (slug) => {
      const repository = createLocalCatalogRepository([product]);
      await render(
        <ProductDetailRouteContent repository={repository} slug={slug} />,
      );

      expect(
        await screen.findByText("We couldn't find that product"),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('link', { name: 'Back to shop' }),
      ).toBeOnTheScreen();
    },
  );
});
