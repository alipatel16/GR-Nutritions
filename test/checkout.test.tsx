import { act, render, screen, userEvent } from '@testing-library/react-native';
import type { User } from 'firebase/auth';
import { storeRequest } from '@/lib/store-api';
import Checkout from '../app/(store)/checkout';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCartStore } from '@/features/cart/cart-store';
import {
  launchPayment,
  PaymentCancelledError,
} from '@/features/checkout/payment-launcher';
import { makeProduct } from './factories/product';

jest.mock('@/lib/store-api', () => ({ storeRequest: jest.fn() }));
jest.mock('@/features/checkout/payment-launcher', () => ({
  launchPayment: jest.fn(),
  PaymentCancelledError: class extends Error {
    constructor() {
      super('Cancelled');
      this.name = 'PaymentCancelledError';
    }
  },
}));
jest.mock('@/features/addresses/AddressBook', () => {
  const { Pressable, Text } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddressBook: ({ onSelect }: { onSelect(a: unknown): void }) => (
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          onSelect({
            id: 'home',
            label: 'Home',
            fullName: 'Alice Patel',
            phone: '9876543210',
            line1: '123 Main Road',
            line2: '',
            city: 'Ahmedabad',
            state: 'Gujarat',
            pincode: '380001',
            isDefault: true,
          })
        }
      >
        <Text>Choose home</Text>
      </Pressable>
    ),
  };
});
const quote = (method = 'razorpay') => ({
  quoteId: `quote-${method}`,
  currency: 'INR',
  mode: 'test',
  subtotalPaise: 99800,
  shippingPaise: 5000,
  codFeePaise: method === 'cod' ? 20000 : 0,
  totalPaise: method === 'cod' ? 124800 : 104800,
  expiresAt: new Date(Date.now() + 300000).toISOString(),
  items: [
    {
      productId: 'product',
      variantId: 'product-variant',
      productName: 'Test Performance Protein',
      quantity: 2,
      unitPricePaise: 49900,
    },
  ],
  delivery: { courierId: 7, courierName: 'Courier One', estimatedDays: '3–5' },
});
const session = (method = 'razorpay') => ({
  id: 'order-one',
  status: method === 'cod' ? 'cod_confirmed' : 'awaiting_payment',
  paymentMethod: method,
  mode: 'test',
  razorpayOrderId: 'order_rzp',
  keyId: 'rzp_test_key',
  amountPaise: method === 'cod' ? 124800 : 104800,
  currency: 'INR',
});
const order = (status = 'paid', method = 'razorpay') => ({
  id: 'order-one',
  status,
  paymentMethod: method,
  mode: 'test',
  totalPaise: method === 'cod' ? 124800 : 104800,
});
const callback = {
  razorpay_payment_id: 'pay_one',
  razorpay_order_id: 'order_rzp',
  razorpay_signature: 'signed',
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({
    user: { uid: 'alice', email: 'alice@example.com' } as User,
    ready: true,
    isAdmin: false,
    error: null,
    logout: async () => {},
  });
  useCartStore.setState({ cart: { lines: [] }, lastError: null });
  const product = makeProduct();
  useCartStore.getState().addProduct(product, product.variants[0].id, 2);
  jest.mocked(launchPayment).mockResolvedValue(callback);
  jest.mocked(storeRequest).mockImplementation(async (action, payload) => {
    if (action === 'checkout.delivery')
      return quote(payload?.paymentMethod as string);
    if (action === 'checkout.create') return session();
    if (action === 'checkout.verify' || action === 'order.status')
      return order();
    throw new Error('Unexpected action');
  });
});
afterEach(() => jest.useRealTimers());
async function prepare(method: 'razorpay' | 'cod' = 'razorpay') {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await render(<Checkout />);
  await user.press(screen.getByRole('button', { name: 'Choose home' }));
  if (method === 'cod')
    await user.press(screen.getByRole('radio', { name: 'Cash on delivery' }));
  await user.press(
    screen.getByRole('button', { name: 'Check delivery & total' }),
  );
  return user;
}
it('uses authoritative subtotal, shipping and COD fees with courier and test mode visible', async () => {
  await prepare('cod');
  expect(screen.getByLabelText('Order subtotal ₹998')).toBeOnTheScreen();
  expect(screen.getByLabelText('Delivery charge ₹50')).toBeOnTheScreen();
  expect(screen.getByLabelText('COD fee ₹200')).toBeOnTheScreen();
  expect(screen.getByLabelText('Order total ₹1,248')).toBeOnTheScreen();
  expect(screen.getByText(/Courier One/)).toBeOnTheScreen();
  expect(screen.getByText(/Test mode/)).toBeOnTheScreen();
});
it('confirms COD only after server status and consumes the unchanged purchased bag', async () => {
  jest
    .mocked(storeRequest)
    .mockImplementation(async (action) =>
      action === 'checkout.delivery'
        ? quote('cod')
        : action === 'checkout.create'
          ? session('cod')
          : order('cod_confirmed', 'cod'),
    );
  const user = await prepare('cod');
  await user.press(screen.getByRole('button', { name: 'Confirm COD order' }));
  expect(await screen.findByText('COD order confirmed')).toBeOnTheScreen();
  expect(screen.getByText(/Amount due on delivery: ₹1,248/)).toBeOnTheScreen();
  expect(useCartStore.getState().cart.lines).toHaveLength(0);
  expect(launchPayment).not.toHaveBeenCalled();
});
it('keeps the bag and reuses the same online session after cancellation', async () => {
  jest.mocked(launchPayment).mockRejectedValue(new PaymentCancelledError());
  const user = await prepare();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  expect(await screen.findByText(/Payment was cancelled/)).toBeOnTheScreen();
  expect(useCartStore.getState().cart.lines[0].quantity).toBe(2);
  await user.press(screen.getByRole('button', { name: 'Continue payment' }));
  expect(
    jest
      .mocked(storeRequest)
      .mock.calls.filter(([action]) => action === 'checkout.create'),
  ).toHaveLength(1);
  expect(launchPayment).toHaveBeenCalledTimes(2);
});
it('never treats a forged client callback rejected by the server as confirmation', async () => {
  jest.mocked(storeRequest).mockImplementation(async (action) => {
    if (action === 'checkout.delivery') return quote();
    if (action === 'checkout.create') return session();
    throw new Error('Invalid signature');
  });
  const user = await prepare();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  expect(await screen.findByRole('alert')).toBeOnTheScreen();
  expect(screen.queryByText('Payment confirmed')).toBeNull();
  expect(useCartStore.getState().cart.lines).toHaveLength(1);
  expect(
    screen.getByRole('button', { name: 'Refresh payment status' }),
  ).toBeOnTheScreen();
});
it('preserves a pending payment bag and offers a server status refresh', async () => {
  jest
    .mocked(storeRequest)
    .mockImplementation(async (action) =>
      action === 'checkout.delivery'
        ? quote()
        : action === 'checkout.create'
          ? session()
          : order('awaiting_payment'),
    );
  const user = await prepare();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  expect(await screen.findByText('Awaiting payment')).toBeOnTheScreen();
  expect(useCartStore.getState().cart.lines).toHaveLength(1);
  await user.press(
    screen.getByRole('button', { name: 'Refresh payment status' }),
  );
  expect(
    jest
      .mocked(storeRequest)
      .mock.calls.some(([action]) => action === 'order.status'),
  ).toBe(true);
});
it('expires quotes before a payment session can be created', async () => {
  jest.useFakeTimers();
  const user = await prepare();
  await act(async () => {
    jest.advanceTimersByTime(300001);
  });
  expect(screen.getByRole('button', { name: 'Pay online' })).toBeDisabled();
  expect(screen.queryByLabelText('Order total ₹1,048')).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  expect(
    jest
      .mocked(storeRequest)
      .mock.calls.some(([action]) => action === 'checkout.create'),
  ).toBe(false);
});
it('invalidates an online quote when COD is selected', async () => {
  const user = await prepare();
  await user.press(screen.getByRole('radio', { name: 'Cash on delivery' }));
  expect(screen.queryByLabelText('Order total ₹1,048')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Confirm COD order' }),
  ).toBeDisabled();
});
it('ignores a delivery response after the payment method changes', async () => {
  let resolve!: (value: unknown) => void;
  jest.mocked(storeRequest).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const user = userEvent.setup();
  await render(<Checkout />);
  await user.press(screen.getByRole('button', { name: 'Choose home' }));
  await user.press(
    screen.getByRole('button', { name: 'Check delivery & total' }),
  );
  await user.press(screen.getByRole('radio', { name: 'Cash on delivery' }));
  await act(async () => {
    resolve(quote());
  });
  expect(screen.queryByLabelText('Order total ₹1,048')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Confirm COD order' }),
  ).toBeDisabled();
});
it('preserves a changed bag if an earlier payment is subsequently confirmed', async () => {
  let resolve!: (value: unknown) => void;
  jest.mocked(storeRequest).mockImplementation(async (action) => {
    if (action === 'checkout.delivery') return quote();
    if (action === 'checkout.create') return session();
    return new Promise((done) => {
      resolve = done;
    });
  });
  const user = await prepare();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  await act(async () => {
    useCartStore.getState().addProduct(makeProduct(), 'product-variant', 1);
  });
  await act(async () => {
    resolve(order());
  });
  expect(useCartStore.getState().cart.lines[0].quantity).toBe(3);
  expect(screen.queryByText('Payment confirmed')).toBeNull();
});
it('reuses the idempotency key after an uncertain session-creation response', async () => {
  let creationCount = 0;
  jest.mocked(storeRequest).mockImplementation(async (action) => {
    if (action === 'checkout.delivery') return quote();
    if (action === 'checkout.create') {
      creationCount += 1;
      if (creationCount === 1) throw new Error('Network response lost');
      return session();
    }
    return order();
  });
  const user = await prepare();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  expect(await screen.findByRole('alert')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  const creates = jest
    .mocked(storeRequest)
    .mock.calls.filter(([action]) => action === 'checkout.create');
  expect(creates).toHaveLength(2);
  expect(creates[1][1]).toEqual(creates[0][1]);
  expect(await screen.findByText('Payment confirmed')).toBeOnTheScreen();
});
it('does not confirm or consume a bag using another server order response', async () => {
  jest
    .mocked(storeRequest)
    .mockImplementation(async (action) =>
      action === 'checkout.delivery'
        ? quote()
        : action === 'checkout.create'
          ? session()
          : { ...order(), id: 'another-order' },
    );
  const user = await prepare();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  expect(await screen.findByRole('alert')).toBeOnTheScreen();
  expect(screen.queryByText('Payment confirmed')).toBeNull();
  expect(useCartStore.getState().cart.lines).toHaveLength(1);
});
it('does not consume another account’s bag after an old payment request completes', async () => {
  let resolve!: (value: unknown) => void;
  jest.mocked(storeRequest).mockImplementation(async (action) => {
    if (action === 'checkout.delivery') return quote();
    if (action === 'checkout.create') return session();
    return new Promise((done) => {
      resolve = done;
    });
  });
  const user = await prepare();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  jest.mocked(useAuth).mockReturnValue({
    user: { uid: 'bob' } as User,
    ready: true,
    isAdmin: false,
    error: null,
    logout: async () => {},
  });
  await screen.rerender(<Checkout />);
  await act(async () => {
    resolve(order());
  });
  expect(useCartStore.getState().cart.lines).toHaveLength(1);
  expect(screen.queryByText('Payment confirmed')).toBeNull();
});
it('retains the original session total when resuming after the delivery quote expires', async () => {
  jest.mocked(launchPayment).mockRejectedValue(new PaymentCancelledError());
  const user = await prepare();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  await act(async () => {
    jest.advanceTimersByTime(300001);
  });
  expect(screen.getByLabelText('Order total ₹1,048')).toBeOnTheScreen();
  expect(
    screen.getByRole('button', { name: 'Check delivery & total' }),
  ).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Continue payment' }));
  expect(
    jest
      .mocked(storeRequest)
      .mock.calls.filter(([action]) => action === 'checkout.create'),
  ).toHaveLength(1);
});
it('checks server status instead of opening a payment window for an already paid session', async () => {
  jest
    .mocked(storeRequest)
    .mockImplementation(async (action) =>
      action === 'checkout.delivery'
        ? quote()
        : action === 'checkout.create'
          ? { ...session(), status: 'paid' }
          : order(),
    );
  const user = await prepare();
  await user.press(screen.getByRole('button', { name: 'Pay online' }));
  expect(await screen.findByText('Payment confirmed')).toBeOnTheScreen();
  expect(launchPayment).not.toHaveBeenCalled();
  expect(storeRequest).toHaveBeenCalledWith('order.status', {
    id: 'order-one',
  });
});
it.each(['declined', 'authorized but pending'])(
  'resumes the existing payment session after %s only when server refresh still reports payment pending',
  async (firstOutcome) => {
    let verifications = 0;
    jest.mocked(storeRequest).mockImplementation(async (action) => {
      if (action === 'checkout.delivery') return quote();
      if (action === 'checkout.create')
        return { ...session(), status: 'payment_pending' };
      if (action === 'order.status') return order('payment_pending');
      verifications += 1;
      return order(
        firstOutcome === 'authorized but pending' && verifications === 1
          ? 'payment_pending'
          : 'paid',
      );
    });
    if (firstOutcome === 'declined')
      jest
        .mocked(launchPayment)
        .mockRejectedValueOnce(new Error('Payment declined'));
    const user = await prepare();
    await user.press(screen.getByRole('button', { name: 'Pay online' }));
    expect(useCartStore.getState().cart.lines).toHaveLength(1);
    expect(screen.queryByText('Payment confirmed')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Continue payment' }),
    ).toBeDisabled();
    await user.press(
      screen.getByRole('button', { name: 'Refresh payment status' }),
    );
    expect(useCartStore.getState().cart.lines).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: 'Continue payment' }),
    ).toBeEnabled();
    await user.press(screen.getByRole('button', { name: 'Continue payment' }));
    expect(await screen.findByText('Payment confirmed')).toBeOnTheScreen();
    expect(useCartStore.getState().cart.lines).toHaveLength(0);
    expect(launchPayment).toHaveBeenCalledTimes(2);
    expect(jest.mocked(launchPayment).mock.calls[1][0]).toEqual(
      jest.mocked(launchPayment).mock.calls[0][0],
    );
    expect(
      jest
        .mocked(storeRequest)
        .mock.calls.filter(([action]) => action === 'checkout.create'),
    ).toHaveLength(1);
    expect(
      jest
        .mocked(storeRequest)
        .mock.calls.filter(([action]) => action === 'checkout.delivery'),
    ).toHaveLength(1);
  },
);
