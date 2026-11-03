import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { randomUUID } from 'expo-crypto';
import type { Address } from '@/features/addresses/address-schema';
import { useCartStore } from '@/features/cart/cart-store';
import type { Cart } from '@/features/cart/types';
import {
  checkoutErrorMessage,
  checkoutService,
  orderIsConfirmed,
  type DeliveryQuote,
  type OrderSummary,
  type PaymentMethod,
  type PaymentSession,
} from './checkout-service';
import { launchPayment } from './payment-launcher';

type QuoteState = { signature: string; value: DeliveryQuote; snapshot: Cart };
type Attempt = {
  signature: string;
  requestKey: string;
  quoteId: string;
  quote: DeliveryQuote;
  snapshot: Cart;
  session?: PaymentSession;
  phase: 'ready' | 'review';
};

export function useCheckout(customer: { uid: string; email?: string | null }) {
  const cart = useCartStore((state) => state.cart);
  const [address, setAddress] = useState<Address>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [confirmed, setConfirmed] = useState<OrderSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signature = JSON.stringify({
    uid: customer.uid,
    address,
    paymentMethod,
    items: cart.lines.map((line) => [
      line.productId,
      line.variantId,
      line.quantity,
      line.unitPricePaise,
    ]),
  });
  const current = useRef(signature);
  const version = useRef(0);
  const alive = useRef(true);
  const running = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      version.current += 1;
    };
  }, []);
  useLayoutEffect(() => {
    current.current = signature;
    version.current += 1;
    running.current = false;
  }, [signature]);
  const [previousSignature, setPreviousSignature] = useState(signature);
  if (previousSignature !== signature) {
    setPreviousSignature(signature);
    setBusy(false);
    setQuoteState(null);
    setAttempt(null);
    setOrder(null);
    setError('');
  }
  const createdSession = attempt?.session;
  useEffect(() => {
    if (!quoteState) return;
    const timer = setTimeout(
      () => {
        setQuoteState(null);
        if (!createdSession)
          setError(
            'Your delivery quote has expired. Check delivery again for current pricing.',
          );
      },
      Math.max(0, Date.parse(quoteState.value.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [quoteState, createdSession]);

  const activeAttempt = attempt?.signature === signature ? attempt : null;
  const session = activeAttempt?.session;
  const quote = session
    ? activeAttempt.quote
    : quoteState?.signature === signature
      ? quoteState.value
      : null;
  const terminal =
    order &&
    [
      'expired',
      'payment_expired',
      'payment_failed',
      'cancelled',
      'refunded',
    ].includes(order.status);
  const canCheckDelivery = Boolean(
    address && cart.lines.length && !busy && (!session || terminal),
  );
  const canContinue = Boolean(
    address &&
    cart.lines.length &&
    !busy &&
    !terminal &&
    ((session && activeAttempt?.phase === 'ready') || (!session && quote)),
  );

  function begin() {
    if (running.current) return null;
    running.current = true;
    const requestVersion = ++version.current;
    const requestSignature = signature;
    setBusy(true);
    setError('');
    const valid = () =>
      alive.current &&
      current.current === requestSignature &&
      version.current === requestVersion;
    const finish = () => {
      if (valid()) {
        running.current = false;
        setBusy(false);
      }
    };
    return { valid, finish };
  }
  function applyOrder(
    value: OrderSummary,
    snapshot: Cart,
    expected: PaymentSession,
  ) {
    if (
      value.id !== expected.id ||
      value.paymentMethod !== expected.paymentMethod ||
      value.mode !== expected.mode ||
      value.totalPaise !== expected.amountPaise
    )
      throw new Error('Order response mismatch');
    setOrder(value);
    if (!orderIsConfirmed(value)) return;
    setConfirmed(value);
    // A changed or replaced bag belongs to a newer shopping action. Leave it intact.
    if (useCartStore.getState().cart === snapshot) {
      useCartStore.setState({ cart: { lines: [] }, lastError: null });
    }
  }
  async function checkDelivery() {
    if (!canCheckDelivery || !address) return;
    const request = begin();
    if (!request) return;
    setQuoteState(null);
    if (terminal) {
      setAttempt(null);
      setOrder(null);
    }
    try {
      const value = await checkoutService.delivery(
        address.id,
        cart.lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
        })),
        paymentMethod,
      );
      if (!request.valid()) return;
      if (Date.parse(value.expiresAt) <= Date.now()) {
        setError(
          'Your delivery quote has expired. Check delivery again for current pricing.',
        );
        return;
      }
      setQuoteState({ signature, value, snapshot: cart });
    } catch (failure) {
      if (request.valid())
        setError(
          checkoutErrorMessage(
            failure,
            'Delivery could not be checked. Please try again.',
          ),
        );
    } finally {
      request.finish();
    }
  }
  async function continueCheckout() {
    if (!canContinue || !address) return;
    if (!session && (!quote || Date.parse(quote.expiresAt) <= Date.now())) {
      setQuoteState(null);
      setError(
        'Your delivery quote has expired. Check delivery again for current pricing.',
      );
      return;
    }
    const request = begin();
    if (!request) return;
    const next: Attempt = activeAttempt ?? {
      signature,
      requestKey: randomUUID(),
      quoteId: quote!.quoteId,
      quote: quote!,
      snapshot: quoteState!.snapshot,
      phase: 'ready',
    };
    setAttempt(next);
    try {
      let paymentSession = next.session;
      if (!paymentSession) {
        paymentSession = await checkoutService.create(
          next.quoteId,
          next.requestKey,
        );
        if (!request.valid()) return;
        next.session = paymentSession;
        setAttempt({ ...next });
      }
      if (paymentSession.paymentMethod !== paymentMethod)
        throw new Error('Payment method mismatch');
      if (
        paymentMethod === 'cod' ||
        !['pending', 'awaiting_payment', 'payment_pending'].includes(
          paymentSession.status,
        )
      ) {
        next.phase = 'review';
        setAttempt({ ...next });
        const result = await checkoutService.status(paymentSession.id);
        if (request.valid()) applyOrder(result, next.snapshot, paymentSession);
      } else {
        const result = await launchPayment(paymentSession, {
          name: address.fullName,
          email: customer.email,
          phone: address.phone,
        });
        if (!request.valid()) return;
        next.phase = 'review';
        setAttempt({ ...next });
        const resultFromServer = await checkoutService.verify(
          paymentSession.id,
          result,
        );
        if (request.valid())
          applyOrder(resultFromServer, next.snapshot, paymentSession);
      }
    } catch (failure) {
      if (!request.valid()) return;
      if (
        next.session &&
        failure instanceof Error &&
        failure.name !== 'PaymentCancelledError' &&
        failure.name !== 'PaymentUnavailableError'
      )
        next.phase = 'review';
      setAttempt({ ...next });
      setError(
        checkoutErrorMessage(
          failure,
          'Payment could not be confirmed. Your bag is saved. Refresh payment status before trying again.',
        ),
      );
    } finally {
      request.finish();
    }
  }
  async function refreshStatus() {
    if (!session || !activeAttempt) return;
    const request = begin();
    if (!request) return;
    try {
      const result = await checkoutService.status(session.id);
      if (!request.valid()) return;
      applyOrder(result, activeAttempt.snapshot, session);
      if (
        session.paymentMethod === 'razorpay' &&
        session.keyId &&
        session.razorpayOrderId &&
        ['pending', 'awaiting_payment', 'payment_pending'].includes(
          result.status,
        )
      ) {
        // Resume only the existing provider order after its server status was checked.
        setAttempt({
          ...activeAttempt,
          session: { ...session, status: result.status },
          phase: 'ready',
        });
      }
    } catch (failure) {
      if (request.valid())
        setError(
          checkoutErrorMessage(
            failure,
            'Order status could not be refreshed. Please try again.',
          ),
        );
    } finally {
      request.finish();
    }
  }
  return {
    cart,
    address,
    setAddress,
    paymentMethod,
    setPaymentMethod,
    quote,
    session,
    order,
    confirmed,
    error,
    busy,
    canContinue,
    canCheckDelivery,
    checkDelivery,
    continueCheckout,
    refreshStatus,
  };
}
