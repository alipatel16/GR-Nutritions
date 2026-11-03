import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import type { PaymentResult, PaymentSession } from './checkout-service';

export class PaymentCancelledError extends Error {
  constructor() { super('Payment cancelled'); this.name = 'PaymentCancelledError'; }
}
export class PaymentUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = 'PaymentUnavailableError'; }
}
export async function launchPayment(session: PaymentSession, customer: { name: string; email?: string | null; phone: string }): Promise<PaymentResult> {
  if (!session.keyId || !session.razorpayOrderId) throw new Error('The payment session is incomplete.');
  if (Platform.OS === 'web') throw new Error('Payment launcher unavailable.');
  if (!NativeModules.RNRazorpayCheckout && !TurboModuleRegistry.get('RNRazorpayCheckout'))
    throw new PaymentUnavailableError('Online payments need the installed GR Nutritions app. You can also pay on our website.');
  // Native SDK is loaded only when paying, keeping Expo Go browsing available.
  let checkout;
  try { checkout = (await import('react-native-razorpay')).default; }
  catch { throw new PaymentUnavailableError('Online payments need the installed GR Nutritions app. You can also pay on our website.'); }
  try {
    const result = await checkout.open({ key: session.keyId, order_id: session.razorpayOrderId, amount: session.amountPaise,
      currency: session.currency, name: 'GR Nutritions', description: 'Nutrition and wellness order',
      prefill: { name: customer.name, email: customer.email ?? '', contact: customer.phone }, theme: { color: '#0A1020' },
    });
    if (result.razorpay_order_id !== session.razorpayOrderId) throw new Error('Payment session mismatch');
    return result;
  } catch (error) {
    if ((error as { code?: number }).code === 0) throw new PaymentCancelledError();
    throw error;
  }
}
