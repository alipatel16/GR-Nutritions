import { addressSchema } from '../address-schema';

const address = {
  label: 'Home',
  fullName: 'Test Shopper',
  phone: '9876543210',
  line1: '12 Example Road',
  line2: '',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  isDefault: false,
};
it('accepts a complete Indian delivery address', () =>
  expect(addressSchema.safeParse(address).success).toBe(true));
it.each([
  { pincode: '000001' },
  { phone: '12345' },
  { state: 'Not a state' },
  { fullName: '' },
])('rejects invalid address %j', (change) => {
  expect(addressSchema.safeParse({ ...address, ...change }).success).toBe(
    false,
  );
});
