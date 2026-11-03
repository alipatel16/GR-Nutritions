import { Link, Redirect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Check,
  CreditCard,
  PackageCheck,
  Truck,
  Wallet,
} from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthProvider';
import { AddressBook } from '@/features/addresses/AddressBook';
import { useCheckout } from '@/features/checkout/use-checkout';
import { orderStatusLabel } from '@/features/checkout/checkout-service';
import { AppText } from '@/components/ui/AppText';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/Button';
import { cartTotals } from '@/features/cart/cart-domain';
import { formatInr } from '@/lib/money';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

export default function Checkout() {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <ActivityIndicator
        accessibilityLabel="Loading checkout"
        color={colors.violet}
      />
    );
  if (!user) return <Redirect href="/account?next=/checkout" />;
  return <CheckoutContent key={user.uid} customer={user} />;
}
function CheckoutContent({
  customer,
}: {
  customer: { uid: string; email?: string | null };
}) {
  const checkout = useCheckout(customer);
  const desktop = useBreakpoint() === 'desktop';
  const { quote, session, confirmed, order, paymentMethod, busy } = checkout;
  const mode = session?.mode ?? quote?.mode;
  return (
    <ScrollView style={styles.page}>
      <PageShell style={styles.shell}>
        <View style={styles.content}>
          <Link href="/cart" style={styles.link}>
            ← Back to your bag
          </Link>
          <View style={styles.heading}>
            <AppText tone="accent" variant="caption">
              GR STORE / CHECKOUT
            </AppText>
            <AppText
              accessibilityRole="header"
              style={styles.title}
              variant="display"
            >
              The final step.
            </AppText>
            <AppText tone="muted">
              Choose where we deliver and how you’d like to pay.
            </AppText>
          </View>
          {confirmed ? (
            <View style={styles.card}>
              <PackageCheck size={36} color={colors.violet} />
              {confirmed.mode === 'test' ? (
                <AppText tone="accent" variant="label">
                  Test mode · No live order
                </AppText>
              ) : null}
              <AppText accessibilityRole="header" variant="heading">
                {orderStatusLabel(confirmed.status)}
              </AppText>
              <AppText tone="muted">Order {confirmed.id}</AppText>
              <AppText variant="title">
                {confirmed.paymentMethod === 'cod'
                  ? 'Amount due on delivery: '
                  : 'Order total: '}
                {formatInr(confirmed.totalPaise)}
              </AppText>
              {confirmed.mode === 'test' ? (
                <AppText tone="muted">
                  This is a test order. It will not be shipped.
                </AppText>
              ) : null}
              <Link href="/orders" style={styles.link}>
                View your orders & tracking →
              </Link>
              <Link href="/shop" style={styles.link}>
                Continue shopping
              </Link>
            </View>
          ) : !checkout.cart.lines.length ? (
            <View style={styles.card}>
              <AppText variant="title">Your bag is empty</AppText>
              <Link href="/shop" style={styles.link}>
                Explore products →
              </Link>
            </View>
          ) : (
            <View style={[styles.columns, !desktop && styles.stacked]}>
              <View style={styles.form}>
                <View style={styles.sectionHeading}>
                  <View style={styles.step}>
                    <AppText style={styles.stepText} variant="label">
                      1
                    </AppText>
                  </View>
                  <AppText variant="title">Delivery address</AppText>
                </View>
                <AddressBook
                  uid={customer.uid}
                  selectedId={checkout.address?.id}
                  onSelect={checkout.setAddress}
                />
                <View style={styles.sectionHeading}>
                  <View style={styles.step}>
                    <AppText style={styles.stepText} variant="label">
                      2
                    </AppText>
                  </View>
                  <AppText variant="title">Payment method</AppText>
                </View>
                {(
                  [
                    [
                      'razorpay',
                      'Pay online',
                      'Secure payment with Razorpay',
                      CreditCard,
                    ],
                    [
                      'cod',
                      'Cash on delivery',
                      '₹200 COD fee, added to your total',
                      Wallet,
                    ],
                  ] as const
                ).map(([method, title, copy, Icon]) => (
                  <Pressable
                    key={method}
                    accessibilityRole="radio"
                    accessibilityLabel={
                      method === 'cod' ? 'Cash on delivery' : 'Pay online'
                    }
                    accessibilityState={{ checked: paymentMethod === method }}
                    onPress={() => checkout.setPaymentMethod(method)}
                    style={[
                      styles.method,
                      paymentMethod === method && styles.selectedMethod,
                    ]}
                  >
                    <Icon color={colors.violet} size={24} />
                    <View style={styles.methodCopy}>
                      <AppText variant="label">{title}</AppText>
                      <AppText tone="muted" variant="caption">
                        {copy}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        paymentMethod === method && styles.selectedRadio,
                      ]}
                    >
                      {paymentMethod === method ? (
                        <Check color={colors.obsidianRaised} size={12} />
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.summary, !desktop && styles.fullWidth]}>
                <AppText variant="title">Your order</AppText>
                {(quote?.items ?? checkout.cart.lines).map((line) => (
                  <View key={line.variantId} style={styles.item}>
                    <View style={styles.itemCopy}>
                      <AppText variant="label">{line.productName}</AppText>
                      <AppText tone="muted" variant="caption">
                        Quantity {line.quantity}
                      </AppText>
                    </View>
                    <AppText variant="label">
                      {formatInr(line.unitPricePaise * line.quantity)}
                    </AppText>
                  </View>
                ))}
                {quote ? (
                  <View style={styles.totals}>
                    <TotalRow
                      label="Subtotal"
                      accessibilityLabel="Order subtotal"
                      amount={quote.subtotalPaise}
                    />
                    <TotalRow
                      label="Delivery"
                      accessibilityLabel="Delivery charge"
                      amount={quote.shippingPaise}
                    />
                    <TotalRow
                      label="Cash on delivery fee"
                      accessibilityLabel="COD fee"
                      amount={quote.codFeePaise}
                    />
                    <TotalRow
                      label="Total"
                      accessibilityLabel="Order total"
                      amount={quote.totalPaise}
                      large
                    />
                    <View style={styles.delivery}>
                      <Truck color={colors.violet} size={20} />
                      <View style={styles.methodCopy}>
                        <AppText variant="label">
                          {quote.delivery.courierName}
                        </AppText>
                        <AppText tone="muted" variant="caption">
                          Estimated delivery: {quote.delivery.estimatedDays}
                          {/^\d+\s*(?:[-–]\s*\d+)?$/.test(
                            quote.delivery.estimatedDays,
                          )
                            ? ' days'
                            : ''}
                        </AppText>
                      </View>
                    </View>
                    <AppText tone="muted" variant="caption">
                      {session
                        ? 'Total agreed for this payment session.'
                        : 'Quote valid for five minutes.'}{' '}
                      Delivery times are estimates.
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.totals}>
                    <TotalRow
                      label="Estimated merchandise"
                      accessibilityLabel="Estimated subtotal"
                      amount={cartTotals(checkout.cart).subtotalPaise}
                    />
                    <AppText tone="muted" variant="caption">
                      Check delivery to see current prices, fees and the final
                      total.
                    </AppText>
                  </View>
                )}
                <AppText tone="muted" variant="caption">
                  Delivery is free above ₹999, otherwise ₹50. Cash on delivery
                  adds ₹200.
                </AppText>
                {mode === 'test' ? (
                  <View style={styles.testBadge}>
                    <AppText tone="accent" variant="label">
                      Test mode · No live payment or shipment
                    </AppText>
                  </View>
                ) : null}
                {session ? (
                  <AppText tone="muted" variant="caption">
                    Order reference: {session.id}
                    {session.amountPaise
                      ? ` · ${formatInr(session.amountPaise)}`
                      : ''}
                  </AppText>
                ) : null}
                {order ? (
                  <AppText accessibilityLiveRegion="polite" variant="label">
                    {orderStatusLabel(order.status)}
                  </AppText>
                ) : null}
                {checkout.error ? (
                  <AppText
                    accessibilityRole="alert"
                    tone="danger"
                    variant="caption"
                  >
                    {checkout.error}
                  </AppText>
                ) : null}
                <Button
                  variant="ghost"
                  disabled={!checkout.canCheckDelivery}
                  onPress={checkout.checkDelivery}
                >
                  Check delivery & total
                </Button>
                <Button
                  disabled={!checkout.canContinue}
                  loading={busy}
                  onPress={checkout.continueCheckout}
                >
                  {paymentMethod === 'cod'
                    ? 'Confirm COD order'
                    : session
                      ? 'Continue payment'
                      : 'Pay online'}
                </Button>
                {session ? (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onPress={checkout.refreshStatus}
                  >
                    Refresh payment status
                  </Button>
                ) : null}
                <Link href="/orders" style={styles.link}>
                  Your orders & tracking →
                </Link>
              </View>
            </View>
          )}
        </View>
      </PageShell>
    </ScrollView>
  );
}
function TotalRow({
  label,
  accessibilityLabel,
  amount,
  large = false,
}: {
  label: string;
  accessibilityLabel: string;
  amount: number;
  large?: boolean;
}) {
  return (
    <View
      accessibilityLabel={`${accessibilityLabel} ${formatInr(amount)}`}
      style={[styles.totalRow, large && styles.grandTotal]}
    >
      <AppText variant={large ? 'title' : 'body'}>{label}</AppText>
      <AppText variant={large ? 'heading' : 'label'}>
        {formatInr(amount)}
      </AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.obsidian },
  shell: { paddingTop: spacing[6], paddingBottom: spacing[20] },
  content: { gap: spacing[8] },
  heading: { gap: spacing[3] },
  title: { color: colors.violet },
  link: {
    color: colors.violet,
    fontFamily: typography.bodySemibold,
    fontSize: 14,
    minHeight: 44,
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[10] },
  stacked: { flexDirection: 'column', gap: spacing[8] },
  form: { flex: 1, width: '100%', minWidth: 0, gap: spacing[4] },
  summary: {
    flex: 0.85,
    minWidth: 0,
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[6],
    gap: spacing[5],
  },
  fullWidth: { width: '100%', flex: 0 },
  card: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[6],
    gap: spacing[5],
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  step: {
    width: 30,
    height: 30,
    backgroundColor: colors.violet,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.obsidianRaised },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    borderColor: colors.line,
    borderWidth: 1,
    padding: spacing[5],
    borderRadius: radii.sm,
    backgroundColor: colors.obsidianRaised,
  },
  selectedMethod: {
    backgroundColor: colors.graphite,
    borderColor: colors.violet,
  },
  methodCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderColor: colors.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: { backgroundColor: colors.violet, borderColor: colors.violet },
  item: {
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  totals: {
    gap: spacing[4],
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: spacing[5],
  },
  totalRow: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotal: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: spacing[4],
  },
  delivery: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  testBadge: {
    padding: spacing[3],
    backgroundColor: colors.graphite,
    borderRadius: radii.sm,
  },
});
