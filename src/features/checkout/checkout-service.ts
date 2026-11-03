import { z } from 'zod';
import { storeRequest } from '@/lib/store-api';

const paise = z.number().int().nonnegative();
export type PaymentMethod = 'razorpay' | 'cod';
export const deliveryQuoteSchema = z.object({
  quoteId: z.string(), mode: z.enum(['test','live']), currency: z.literal('INR'), subtotalPaise: paise,
  shippingPaise: paise, codFeePaise: paise, totalPaise: paise.positive(),
  expiresAt: z.iso.datetime({ offset: true }),
  items: z.array(z.object({ productId: z.string(), variantId: z.string(), productName: z.string(), quantity: z.number().int().positive(), unitPricePaise: paise.positive() })),
  delivery: z.object({ courierId: z.number(), courierName: z.string(), estimatedDays: z.string() }),
});
export type DeliveryQuote = z.infer<typeof deliveryQuoteSchema>;
const trackingSchema = z.object({
  awb: z.string().optional(), courierName: z.string().optional(), status: z.string(),
  url: z.url().refine(value => value.startsWith('https://')).optional(), shipmentId: z.number().optional(),
});
export const orderSummarySchema = z.object({
  id: z.string(), status: z.string(), totalPaise: paise.positive(),
  paymentMethod: z.enum(['razorpay', 'cod']), mode: z.enum(['test','live']),
  shippingPaise: paise.optional(), codFeePaise: paise.optional(), tracking: trackingSchema.nullish(),
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;
export const paymentSessionSchema = z.object({
  id: z.string(), status: z.string(), paymentMethod: z.enum(['razorpay','cod']),
  mode: z.enum(['test','live']), razorpayOrderId: z.string().optional(), keyId: z.string().optional(),
  amountPaise: paise.positive(), currency: z.literal('INR'),
});
export type PaymentSession = z.infer<typeof paymentSessionSchema>;
export type PaymentResult = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
export type CartItemRequest = { productId: string; variantId: string; quantity: number };

export const checkoutService = {
  async delivery(addressId: string, items: CartItemRequest[], paymentMethod: PaymentMethod) {
    return deliveryQuoteSchema.parse(await storeRequest('checkout.delivery', { addressId, items, paymentMethod }));
  },
  async create(quoteId: string, requestKey: string) {
    return paymentSessionSchema.parse(await storeRequest('checkout.create', { quoteId, requestKey }));
  },
  async verify(orderId: string, result: PaymentResult) {
    return orderSummarySchema.parse(await storeRequest('checkout.verify', { orderId, razorpay_payment_id: result.razorpay_payment_id, razorpay_signature: result.razorpay_signature }));
  },
  async status(id: string) { return orderSummarySchema.parse(await storeRequest('order.status', { id })); },
};

export function orderIsConfirmed(order: Pick<OrderSummary,'status'>) {
  return ['paid','cod_confirmed','processing','shipped','delivered'].includes(order.status);
}
export function orderStatusLabel(status: string) {
  return ({ pending:'Awaiting payment', payment_pending:'Awaiting payment', payment_expired:'Checkout expired', payment_failed:'Payment not completed', awaiting_payment:'Awaiting payment', paid:'Payment confirmed', cod_confirmed:'COD order confirmed', processing:'Preparing your order',
    shipped:'On the way', delivered:'Delivered', cancelled:'Cancelled', refunded:'Refunded', expired:'Checkout expired', payment_review:'Payment is being reviewed',
    creation_uncertain:'Checking your payment session' } as Record<string,string>)[status] ?? 'Order update pending';
}

export function checkoutErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.name === 'PaymentCancelledError') return 'Payment was cancelled. Your bag is saved and you can try again.';
  if (error instanceof Error && error.name === 'PaymentUnavailableError') return error.message;
  if (error instanceof Error && error.name === 'StoreRequestError' && error.message.length < 350
    && !/secret|api.?key|password|token|firebase|supabase|SQL|constraint|stack|relation|service.role|function|JWT/i.test(error.message)) return error.message;
  return fallback;
}
