import { act, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { HomeScreen } from '@/features/home/HomeScreen';
import { ProductDetailScreen } from '@/features/catalog/ProductDetailScreen';
import {
  breakpointForWidth,
  initialBreakpointForPlatform,
} from '@/theme/use-breakpoint';
import { localCatalogRepository } from '@/features/catalog/local-catalog-repository';
import { makeProduct } from '../factories/product';
import { CartScreen } from '@/features/cart/CartScreen';
import { useCartStore } from '@/features/cart/cart-store';
import { WebHeader } from '@/components/navigation/WebHeader';
import { MobileTabs } from '@/components/navigation/MobileTabs';

describe('narrow storefront layout', () => {
  beforeEach(() => {
    useCartStore.setState({ cart: { lines: [] }, lastError: null });
    Dimensions.set({
      window: { width: 320, height: 720, scale: 2, fontScale: 1 },
      screen: { width: 320, height: 720, scale: 2, fontScale: 1 },
    });
  });

  it('uses the mobile breakpoint at the smallest supported width', () => {
    expect(breakpointForWidth(320)).toBe('mobile');
    expect(breakpointForWidth(768)).toBe('tablet');
    expect(breakpointForWidth(1440)).toBe('desktop');
  });

  it('uses a deterministic web breakpoint for server and first client render', () => {
    expect(initialBreakpointForPlatform('web', 1440)).toBe('mobile');
    expect(initialBreakpointForPlatform('ios', 1440)).toBe('desktop');
  });

  it('keeps essential discovery actions available in 320 pixels', async () => {
    await render(<HomeScreen repository={localCatalogRepository} />);

    expect(
      screen.getByRole('link', { name: 'Shop all supplements' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('link', { name: 'Find my stack' }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('home-hero-copy')).toHaveStyle({
      flexBasis: '100%',
      minWidth: 0,
    });
    expect(screen.getByTestId('home-hero-visual')).toHaveStyle({
      flexBasis: '100%',
      minWidth: 0,
    });
  });

  it('keeps search and category discovery available in the mobile header', async () => {
    await render(<WebHeader />);

    expect(
      screen.getByLabelText('Search products and brands'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Protein')).toBeOnTheScreen();
    expect(screen.getByText('Pre & post workout')).toBeOnTheScreen();
    expect(screen.queryByText('Choose delivery address')).not.toBeOnTheScreen();
  });

  it('shows the full search and delivery tools on desktop', async () => {
    Dimensions.set({
      window: { width: 1440, height: 1000, scale: 1, fontScale: 1 },
      screen: { width: 1440, height: 1000, scale: 1, fontScale: 1 },
    });

    await render(<WebHeader />);

    expect(
      await screen.findByLabelText('Search products and brands'),
    ).toBeOnTheScreen();
    expect(await screen.findByText('Choose delivery address')).toBeOnTheScreen();
    expect(screen.getByText('All categories')).toBeOnTheScreen();
  });

  it('keeps the product image and purchase action inside the narrow canvas', async () => {
    await render(<ProductDetailScreen product={makeProduct()} />);

    expect(
      screen.getByRole('button', { name: 'Add to cart' }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('product-gallery')).toHaveStyle({
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto',
      minWidth: 0,
    });
    expect(screen.getByTestId('product-purchase')).toHaveStyle({
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto',
      minWidth: 0,
    });
  });

  it('stacks cart lines and the order summary without hiding checkout context', async () => {
    const product = makeProduct();
    await act(() => {
      useCartStore.getState().addProduct(product, product.variants[0].id);
    });
    await render(<CartScreen />);

    expect(screen.getByText('Order summary')).toBeOnTheScreen();
    expect(screen.getByTestId('cart-lines')).toHaveStyle({
      flexBasis: '100%',
      minWidth: 0,
    });
    expect(screen.getByTestId('cart-summary')).toHaveStyle({
      flexBasis: '100%',
      minWidth: 0,
    });
  });

  it('keeps the mobile cart count attached to the bag icon', async () => {
    const product = makeProduct();
    await act(() => {
      useCartStore.getState().addProduct(product, product.variants[0].id);
    });

    await render(<MobileTabs />);

    expect(screen.getByTestId('mobile-cart-icon-wrap')).toHaveStyle({
      position: 'relative',
    });
    expect(screen.getByTestId('mobile-cart-badge')).toHaveStyle({
      position: 'absolute',
    });
  });
});
