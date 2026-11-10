import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import { MobileTabs } from '@/components/navigation/MobileTabs';
import { makeProduct, makeVariant } from '../../../../test/factories/product';
import { emptyCart } from '../cart-domain';
import { CartScreen } from '../CartScreen';
import { useCartStore } from '../cart-store';

const product = makeProduct({
  id: 'cart-product',
  slug: 'cart-product',
  name: 'Performance Protein',
  variants: [
    makeVariant({
      id: 'cart-variant',
      sku: 'CART-1K',
      label: 'Cocoa • 1 kg',
      pricePaise: 199900,
      stockAvailable: 4,
    }),
  ],
});

describe('CartScreen', () => {
  beforeEach(() => {
    useCartStore.setState({ cart: emptyCart(), lastError: null });
  });

  it('renders lines, item count, and integer-paise subtotal', async () => {
    useCartStore.getState().addProduct(product, 'cart-variant', 2);

    await render(<CartScreen />);

    expect(screen.getByText('Performance Protein')).toBeOnTheScreen();
    expect(screen.getByText('Cocoa • 1 kg')).toBeOnTheScreen();
    expect(screen.getByText('2 items')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cart subtotal ₹3,998')).toBeOnTheScreen();
  });

  it('adjusts quantity and removes a line', async () => {
    const user = userEvent.setup();
    await act(() => {
      useCartStore.getState().addProduct(product, 'cart-variant', 1);
    });
    await render(<CartScreen />);

    await user.press(
      screen.getByRole('button', {
        name: 'Increase Performance Protein quantity',
      }),
    );
    expect(screen.getByLabelText('Quantity 2')).toBeOnTheScreen();

    await user.press(
      screen.getByRole('button', { name: 'Remove Performance Protein' }),
    );

    expect(
      screen.getByText('Your cart is ready for a fresh start'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('link', { name: 'Browse supplements' }),
    ).toBeOnTheScreen();
  });

  it('asks guests to sign in before checkout', async () => {
    await act(() => {
      useCartStore.getState().addProduct(product, 'cart-variant', 1);
    });
    await render(<CartScreen />);

    expect(
      screen.getByText('Sign in securely, then choose a delivery address.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Sign in to checkout' }),
    ).toBeEnabled();
  });

  it('updates the cart badge in navigation', async () => {
    await render(<MobileTabs />);
    expect(screen.getByLabelText('Cart, empty')).toBeOnTheScreen();

    await act(() => {
      useCartStore.getState().addProduct(product, 'cart-variant', 1);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Cart, 1 item')).toBeOnTheScreen();
    });
  });
});
