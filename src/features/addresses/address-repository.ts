import { z } from 'zod';
import { storeRequest } from '@/lib/store-api';
import { addressSchema, type Address, type AddressInput } from './address-schema';

export const addressRepository = {
  // The server uses verified login identity, never this UI scoping key.
  async list(_uid: string): Promise<Address[]> {
    return z.array(addressSchema.extend({ id: z.string() })).parse(await storeRequest('addresses.list'));
  },
  async save(_uid: string, input: AddressInput, id?: string): Promise<string> {
    return z.object({ id: z.string() }).parse(await storeRequest('address.save', { id, address: addressSchema.parse(input) })).id;
  },
  async remove(_uid: string, id: string) { await storeRequest('address.remove', { id }); },
  async setDefault(_uid: string, id: string) { await storeRequest('address.default', { id }); },
};
