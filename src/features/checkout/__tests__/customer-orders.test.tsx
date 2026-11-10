import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import type { User } from 'firebase/auth';
import Orders from '../../../../app/(store)/orders';
import { storeRequest } from '@/lib/store-api';
import { useAuth } from '@/features/auth/AuthProvider';

jest.mock('@/lib/store-api', () => ({ storeRequest: jest.fn() }));
const ownOrder = {
  id: 'my-order',
  status: 'cod_confirmed',
  totalPaise: 124800,
  paymentMethod: 'cod',
  mode: 'test',
  shippingPaise: 5000,
  codFeePaise: 20000,
  tracking: {
    status: 'in_transit',
    awb: 'AWB123',
    courierName: 'Courier One',
    url: 'https://track.example.com/AWB123',
  },
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({
    user: { uid: 'alice' } as User,
    ready: true,
    isAdmin: false,
    error: null,
    logout: async () => {},
  });
  jest.mocked(storeRequest).mockResolvedValue([ownOrder]);
});
it('shows server status, test mode, COD amount due and tracking instead of calling COD paid', async () => {
  await render(<Orders />);
  expect(await screen.findByText('COD order confirmed')).toBeOnTheScreen();
  expect(screen.getByText(/Amount due on delivery: ₹1,248/)).toBeOnTheScreen();
  expect(screen.getByText(/Test order/)).toBeOnTheScreen();
  expect(screen.getByText('AWB123')).toBeOnTheScreen();
  expect(screen.queryByText('Payment confirmed')).toBeNull();
});
it('retains legacy orders without guessing their payment method or live mode', async () => {
  jest
    .mocked(storeRequest)
    .mockResolvedValue([
      { id: 'old-order', status: 'pending', totalPaise: 99000 },
    ]);
  await render(<Orders />);
  expect(await screen.findByText('Awaiting payment')).toBeOnTheScreen();
  expect(screen.getByText('Payment details unavailable')).toBeOnTheScreen();
  expect(screen.queryByText(/Live order|Test order/)).toBeNull();
});
it('never opens an unsafe tracking URL', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  jest.mocked(storeRequest).mockResolvedValue([
    {
      ...ownOrder,
      tracking: { ...ownOrder.tracking, url: 'javascript:alert(1)' },
    },
  ]);
  await render(<Orders />);
  await screen.findByText('AWB123');
  expect(
    screen.queryByRole('button', { name: 'Track order my-order' }),
  ).toBeNull();
  expect(open).not.toHaveBeenCalled();
  open.mockRestore();
});
it('opens HTTPS tracking and refreshes only the chosen owned shipment', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const user = userEvent.setup();
  await render(<Orders />);
  await screen.findByText('AWB123');
  await user.press(
    screen.getByRole('button', { name: 'Track order my-order' }),
  );
  expect(open).toHaveBeenCalledWith('https://track.example.com/AWB123');
  jest.mocked(storeRequest).mockResolvedValueOnce({
    ...ownOrder,
    status: 'delivered',
    tracking: { ...ownOrder.tracking, status: 'delivered' },
  });
  await user.press(
    screen.getByRole('button', { name: 'Refresh order my-order' }),
  );
  expect(storeRequest).toHaveBeenLastCalledWith('shipment.sync', {
    orderId: 'my-order',
  });
  expect(await screen.findByText('Delivered')).toBeOnTheScreen();
  open.mockRestore();
});
it('shows a retry action after a safe loading failure', async () => {
  jest
    .mocked(storeRequest)
    .mockRejectedValueOnce(new Error('secret token database details'));
  const user = userEvent.setup();
  await render(<Orders />);
  expect(await screen.findByRole('alert')).not.toHaveTextContent(
    'secret token',
  );
  await user.press(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('COD order confirmed')).toBeOnTheScreen();
});
it('clears old account orders and ignores its late request when the signed-in user changes', async () => {
  let resolveOld!: (value: unknown) => void;
  jest.mocked(storeRequest).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveOld = resolve;
    }),
  );
  const view = await render(<Orders />);
  jest.mocked(useAuth).mockReturnValue({
    user: { uid: 'bob' } as User,
    ready: true,
    isAdmin: false,
    error: null,
    logout: async () => {},
  });
  jest.mocked(storeRequest).mockResolvedValueOnce([]);
  await view.rerender(<Orders />);
  await act(async () => {
    resolveOld([ownOrder]);
  });
  expect(screen.queryByText('my-order')).toBeNull();
  expect(screen.getByText(/Your orders will appear here/)).toBeOnTheScreen();
});
it('shows saved coupon and discount from the server order snapshot',async()=>{
 jest.mocked(storeRequest).mockResolvedValue([{...ownOrder,couponCode:'SAVE10',discountPaise:10000}]);
 await render(<Orders/>);
 expect(await screen.findByText('Coupon SAVE10 · Discount ₹100')).toBeOnTheScreen();
});
