import { fireEvent, render, screen } from '@testing-library/react-native';
import { AdminCouponPanel } from '../AdminCouponPanel';
import { couponRepository } from '../coupon-repository';
jest.mock('../coupon-repository', () => ({
  couponRepository: { list: jest.fn(), save: jest.fn() },
}));
const saved = {
  id: 'coupon-one',
  code: 'WELCOME10',
  type: 'percentage',
  value: 10,
  minSpendPaise: 50000,
  maxDiscountPaise: 10000,
  startsAt: null,
  expiresAt: '2026-12-31T18:29:00.000Z',
  usageLimit: 50,
  enabled: true,
  usedCount: 2,
  reservedCount: 1,
  remainingCount: 47,
  version: 1,
  createdAt: '2026-11-05T00:00:00.000Z',
  updatedAt: '2026-11-05T00:00:00.000Z',
} as const;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(couponRepository.list).mockResolvedValue([saved]);
  jest.mocked(couponRepository.save).mockResolvedValue(saved);
});
it('creates a coupon with exact rupees, India dates, a global cap and one use per customer', async () => {
  await render(<AdminCouponPanel />);
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Create coupon' }),
  );
  for (const [label, value] of [
    ['Coupon code', 'WELCOME10'],
    ['Discount value', '10'],
    ['Minimum spend (₹)', '500'],
    ['Maximum discount (₹), optional', '100'],
    ['Expiry (IST)', '2026-12-31 23:59'],
    ['Total customer limit', '50'],
  ])
    await fireEvent.changeText(screen.getByLabelText(label), value);
  expect(screen.getByText(/Once per signed-in customer/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Save coupon' }));
  expect(await screen.findByText('Coupon saved.')).toBeOnTheScreen();
  expect(couponRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({
      code: 'WELCOME10',
      value: 10,
      minSpendPaise: 50000,
      maxDiscountPaise: 10000,
      expiresAt: '2026-12-31T18:29:00.000Z',
      usageLimit: 50,
      enabled: true,
    }),
  );
});
it('shows server usage and saves edits and disabled status', async () => {
  await render(<AdminCouponPanel />);
  expect(
    await screen.findByText(/2 used · 1 reserved · 47 remaining/),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit WELCOME10' }));
  await fireEvent(
    screen.getByRole('switch', { name: 'Coupon enabled' }),
    'valueChange',
    false,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save coupon' }));
  expect(await screen.findByText('Coupon saved.')).toBeOnTheScreen();
  expect(couponRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'coupon-one', enabled: false }),
  );
});
it('rejects impossible India calendar dates without saving', async () => {
  await render(<AdminCouponPanel />);
  await fireEvent.press(
    await screen.findByRole('button', { name: 'Edit WELCOME10' }),
  );
  await fireEvent.changeText(
    screen.getByLabelText('Expiry (IST)'),
    '2026-02-31 23:59',
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save coupon' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/valid date/);
  expect(couponRepository.save).not.toHaveBeenCalled();
});
