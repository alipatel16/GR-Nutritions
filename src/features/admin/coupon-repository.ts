import { z } from 'zod';
import { storeRequest } from '@/lib/store-api';
const paise = z.number().int().nonnegative();
export const couponSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minSpendPaise: paise,
  maxDiscountPaise: paise.nullable(),
  startsAt: z.string().nullable(),
  expiresAt: z.string(),
  usageLimit: z.number().int().positive(),
  enabled: z.boolean(),
  version: z.number().int(),
  usedCount: paise,
  reservedCount: paise,
  remainingCount: paise,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminCoupon = z.infer<typeof couponSchema>;
export type CouponInput = Omit<
  AdminCoupon,
  | 'id'
  | 'version'
  | 'usedCount'
  | 'reservedCount'
  | 'remainingCount'
  | 'createdAt'
  | 'updatedAt'
> & { id?: string };
export const couponRepository = {
  async list(search = '') {
    return z
      .object({ coupons: z.array(couponSchema) })
      .parse(
        await storeRequest(
          'coupon.adminList',
          search.trim() ? { search: search.trim() } : {},
        ),
      ).coupons;
  },
  async save(input: CouponInput) {
    return couponSchema.parse(await storeRequest('coupon.save', input));
  },
};
