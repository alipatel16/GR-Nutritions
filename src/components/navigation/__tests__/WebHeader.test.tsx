import { render, screen, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useCartStore } from '@/features/cart/cart-store';

import { WebHeader } from '../WebHeader';

const mockedUseAuth = jest.mocked(useAuth);

describe('WebHeader', () => {
  beforeEach(() => {
    Dimensions.set({
      window: { width: 1440, height: 1000, scale: 1, fontScale: 1 },
      screen: { width: 1440, height: 1000, scale: 1, fontScale: 1 },
    });
    mockedUseAuth.mockReturnValue({
      user: null,
      ready: true,
      isAdmin: false,
      error: null,
      logout: jest.fn(),
    });
    useCartStore.setState({ cart: { lines: [] }, lastError: null });
  });

  it('shows sign in only for a signed-out customer', async () => {
    await render(<WebHeader />);

    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeOnTheScreen();
    });
  });

  it('shows the signed-in customer identity instead of sign in', async () => {
    mockedUseAuth.mockReturnValue({
      user: { email: 'ali@example.com', displayName: 'Ali Patel' } as never,
      ready: true,
      isAdmin: false,
      error: null,
      logout: jest.fn(),
    });

    await render(<WebHeader />);

    await waitFor(() => {
      expect(screen.getByText('Ali')).toBeOnTheScreen();
      expect(screen.queryByText('Sign in')).not.toBeOnTheScreen();
    });
  });

  it('hides the cart badge when the cart is empty', async () => {
    await render(<WebHeader />);

    expect(screen.queryByTestId('web-cart-badge')).not.toBeOnTheScreen();
  });

  it('anchors a non-zero cart badge to the cart icon', async () => {
    useCartStore.setState({
      cart: {
        lines: [
          {
            variantId: 'variant-1',
            productId: 'product-1',
            productSlug: 'product-1',
            productName: 'Product',
            variantLabel: '1 kg',
            quantity: 2,
            unitPricePaise: 100,
            stockAvailable: 10,
            imageColor: '#FFFFFF',
          },
        ],
      },
      lastError: null,
    });

    await render(<WebHeader />);

    expect(screen.getByTestId('web-cart-icon-wrap')).toHaveStyle({
      position: 'relative',
    });
    expect(screen.getByTestId('web-cart-badge')).toHaveStyle({
      position: 'absolute',
    });
    expect(screen.getByText('2')).toBeOnTheScreen();
  });
});
