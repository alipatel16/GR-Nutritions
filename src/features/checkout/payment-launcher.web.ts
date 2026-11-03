import type { PaymentResult, PaymentSession } from './checkout-service';

export class PaymentCancelledError extends Error {
  constructor() { super('Payment cancelled'); this.name = 'PaymentCancelledError'; }
}
export class PaymentUnavailableError extends Error {
  constructor(message: string) { super(message); this.name = 'PaymentUnavailableError'; }
}
type RazorpayInstance = { open(): void; on(event: string, handler: (response: unknown) => void): void; close(): void };
type RazorpayConstructor = new (options: Record<string,unknown>) => RazorpayInstance;
declare global { interface Window { Razorpay?: RazorpayConstructor } }
let scriptPromise: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve,reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
    const timer = setTimeout(() => { script.remove(); scriptPromise = undefined; reject(new PaymentUnavailableError('The payment window could not load. Check your connection and try again.')); }, 15000);
    script.onload = () => { clearTimeout(timer); if (window.Razorpay) resolve(); else { scriptPromise = undefined; reject(new Error('Payment window unavailable')); } };
    script.onerror = () => { clearTimeout(timer); script.remove(); scriptPromise = undefined; reject(new PaymentUnavailableError('The payment window could not load. Check your connection and try again.')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
export async function launchPayment(session: PaymentSession, customer: { name: string; email?: string | null; phone: string }): Promise<PaymentResult> {
  if (!session.keyId || !session.razorpayOrderId) throw new Error('The payment session is incomplete.');
  await loadCheckout();
  return new Promise((resolve,reject) => {
    let completed = false;
    const finish = (action: () => void) => { if (!completed) { completed = true; action(); } };
    const checkout = new window.Razorpay!({ key: session.keyId, order_id: session.razorpayOrderId, amount: session.amountPaise,
      currency: session.currency, name: 'GR Nutritions', description: 'Nutrition and wellness order',
      prefill: { name: customer.name, email: customer.email ?? '', contact: customer.phone }, theme: { color: '#0A1020' },
      handler: (result: PaymentResult) => finish(() => result.razorpay_order_id === session.razorpayOrderId ? resolve(result) : reject(new Error('Payment session mismatch'))),
      modal: { ondismiss: () => finish(() => reject(new PaymentCancelledError())) },
    });
    checkout.on('payment.failed', () => finish(() => { checkout.close(); reject(new Error('Payment was not completed.')); }));
    checkout.open();
  });
}
