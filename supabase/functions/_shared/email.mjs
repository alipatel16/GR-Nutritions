import {z} from 'zod';
const customerEmail=z.email().max(254);
export const isValidCustomerEmail=value=>customerEmail.safeParse(value).success;
