import { z } from 'zod';

export function httpsTrackingUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
const money = z.number().int().nonnegative();
// Older orders predate payment modes and tracking. Missing fields remain unknown.
export const customerOrderSchema = z.object({
  id: z.string(),
  status: z.string(),
  totalPaise: money,
  paymentMethod: z.enum(['razorpay', 'cod']).nullish(),
  mode: z.enum(['test', 'live']).nullish(),
  subtotalPaise: money.nullish(),
  shippingPaise: money.nullish(),
  codFeePaise: money.nullish(),
  createdAt: z.string().optional(),
  items: z
    .array(
      z.object({
        productName: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .optional(),
  tracking: z
    .object({
      status: z.string().optional(),
      awb: z.string().optional(),
      courierName: z.string().optional(),
      url: z.unknown().transform(httpsTrackingUrl).optional(),
    })
    .nullish(),
});
export const customerOrdersSchema = z.array(customerOrderSchema);
export type CustomerOrder = z.infer<typeof customerOrderSchema>;
