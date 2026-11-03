import { z } from 'zod';
import { storeRequest, resolveProductMedia } from '@/lib/store-api';
import { requireSupabase } from '@/lib/supabase';
import { catalogSchema, productSchema } from '@/features/catalog/schema';
import type { Product } from '@/features/catalog/types';
import { orderSummarySchema } from '@/features/checkout/checkout-service';

const ordersSchema = z.array(z.object({
  id: z.string(), status: z.string(), totalPaise: z.number().int().positive(), userId: z.string(),
  items: z.array(z.object({ productName: z.string(), quantity: z.number().int().positive() })),
  mode: z.enum(['test','live']).optional(), paymentMethod: z.enum(['razorpay','cod']).optional(),
  tracking: z.object({ shipmentId: z.number().optional(), awb: z.string().optional(), courierName: z.string().optional(), status: z.string(), url: z.url().optional() }).nullish(),
}));
export type AdminOrder = z.infer<typeof ordersSchema>[number];
export const adminRepository = {
  async products() { return resolveProductMedia(catalogSchema.parse(await storeRequest('products.list'))); },
  async orders() { return ordersSchema.parse(await storeRequest('orders.adminList')); },
  async save(product: Product) { return productSchema.parse(await storeRequest('product.save', product)); },
  async advance(id: string, status: string) { await storeRequest('order.advance', { id, status }); },
  async createShipment(orderId: string) { return orderSummarySchema.parse(await storeRequest('shipment.create', { orderId })); },
  async syncShipment(orderId: string) { return orderSummarySchema.parse(await storeRequest('shipment.sync', { orderId })); },
  async integrationStatus() {
    return z.object({ mode: z.enum(['test','live']), razorpay: z.object({testConfigured:z.boolean(),liveConfigured:z.boolean()}),
      shiprocket:z.object({configured:z.boolean()}) }).parse(await storeRequest('integration.status'));
  },
  async checkIntegrations() {
    return z.object({mode:z.enum(['test','live']),razorpay:z.object({testConnected:z.boolean(),liveConnected:z.boolean()}),
      shiprocket:z.object({connected:z.boolean(),pickupMatched:z.boolean()})}).parse(await storeRequest('integration.check'));
  },
  async upload(productId: string, uri: string, mime: string) {
    const response = await fetch(uri);
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 1.5 * 1024 * 1024) throw new Error('This image is still too large after compression. Try a smaller photo.');
    const target = z.object({ path: z.string(), token: z.string() }).parse(await storeRequest('media.upload', { productId, mime }));
    const { error } = await requireSupabase().storage.from('product-media').uploadToSignedUrl(target.path, target.token, bytes, { contentType: mime, upsert: false });
    if (error) throw new Error('Image upload failed. Please retry.');
    return z.object({ path: z.string(), uri: z.url() }).parse(await storeRequest('media.complete', { productId, path: target.path }));
  },
};
