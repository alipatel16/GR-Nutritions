import { useState } from 'react';
import { Link, Redirect } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import {
  Check,
  CreditCard,
  LockKeyhole,
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
import { colors, radii, spacing, typography, shadows } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';
import { ChromeScrollView } from '@/components/navigation/ScrollChrome';

const checkoutSteps = ['Bag', 'Delivery', 'Payment', 'Done'] as const;
const stickySummary =
  Platform.OS === 'web'
    ? ({
        alignSelf: 'flex-start',
        position: 'sticky' as ViewStyle['position'],
        top: 24,
      } satisfies ViewStyle)
    : undefined;

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
  const [couponDraft, setCouponDraft] = useState('');
  const desktop = useBreakpoint() === 'desktop';
  const { quote, session, confirmed, order, paymentMethod, busy } = checkout;
  const mode = session?.mode ?? quote?.mode;
  // Visual progress only: bag is done, then delivery, payment and confirmation.
  const currentStep = confirmed ? 4 : quote ? 3 : 2;
  const showBar = !desktop && !confirmed && checkout.cart.lines.length > 0;
  // The same two buttons: inside the summary on desktop, pinned to the bottom on phones.
  const actions = (
    <View style={[styles.actions, !desktop && styles.barActions]}>
      <Button
        variant="ghost"
        disabled={!checkout.canCheckDelivery}
        onPress={checkout.checkDelivery}
        style={!desktop && styles.barButton}
      >
        Check delivery & total
      </Button>
      <Button
        disabled={!checkout.canContinue}
        loading={busy}
        onPress={checkout.continueCheckout}
        style={!desktop && styles.barButton}
      >
        {paymentMethod === 'cod'
          ? 'Confirm COD order'
          : session
            ? 'Continue payment'
            : 'Pay online'}
      </Button>
    </View>
  );
  return (
    <View style={styles.screen}>
      <ChromeScrollView
        contentContainerStyle={showBar ? styles.scrollWithBar : undefined}
        style={styles.page}
      >
        <View style={[styles.hero, !desktop && styles.mobileHero]}>
          <PageShell>
            <View style={[styles.heroRow, !desktop && styles.mobileHeroRow]}>
              <View style={[styles.heroCopy, !desktop && styles.stackedItem]}>
                <View style={styles.secureRow}>
                  <LockKeyhole color={colors.mint} size={15} />
                  <AppText style={styles.eyebrow}>SECURE CHECKOUT</AppText>
                </View>
                <AppText
                  accessibilityRole="header"
                  style={[styles.heroTitle, !desktop && styles.mobileHeroTitle]}
                >
                  The final step.
                </AppText>
                {desktop ? (
                  <AppText style={styles.secureText} variant="caption">
                    Choose where we deliver and how you’d like to pay. Payments
                    are processed by Razorpay; your card details never touch our
                    servers.
                  </AppText>
                ) : null}
              </View>
              <View
                accessible
                accessibilityLabel={`Checkout progress: ${checkoutSteps[currentStep - 1]}`}
                style={[styles.steps, !desktop && styles.mobileSteps, !desktop && styles.stackedItem]}
              >
                {checkoutSteps.map((name, index) => {
                  const done =
                    index + 1 < currentStep ||
                    (confirmed && index + 1 === currentStep);
                  const active = index + 1 === currentStep && !confirmed;
                  return (
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      key={name}
                      style={styles.stepItem}
                    >
                      <View
                        style={[
                          styles.stepDot,
                          done && styles.stepDotDone,
                          active && styles.stepDotActive,
                        ]}
                      >
                        {done ? (
                          <Check color={colors.onMint} size={12} />
                        ) : (
                          <AppText
                            style={[
                              styles.stepDotText,
                              active && styles.stepDotTextActive,
                            ]}
                          >
                            {index + 1}
                          </AppText>
                        )}
                      </View>
                      <AppText
                        style={[
                          styles.stepName,
                          (done || active) && styles.stepNameOn,
                        ]}
                      >
                        {name}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            </View>
          </PageShell>
        </View>
        <PageShell style={[styles.shell, !desktop && styles.mobileShell]}>
          <View style={[styles.content, !desktop && styles.mobileContent]}>
            <Link href="/cart" style={styles.link}>
              ← Back to your bag
            </Link>
            {confirmed ? (
              <View style={[styles.card, styles.confirmedCard]}>
                <View style={styles.successIcon}>
                  <PackageCheck size={30} color={colors.onMint} />
                </View>
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
                {confirmed.couponCode && (confirmed.discountPaise ?? 0) > 0 ? <AppText>Coupon {confirmed.couponCode} · Saved {formatInr(confirmed.discountPaise!)}</AppText> : null}
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
                <View
                style={[styles.form, !desktop && styles.stackedItem]}
                testID="checkout-form"
              >
                  <View
                    style={[styles.section, !desktop && styles.mobileSection]}
                  >
                    <View style={styles.sectionHeading}>
                      <View style={styles.step}>
                        <AppText style={styles.stepText} variant="label">
                          1
                        </AppText>
                      </View>
                      <AppText variant="title">Delivery address</AppText>
                    </View>
                    {checkout.paymentLocked && checkout.address ? <View style={{gap:8}}>
                      <AppText variant="label">{checkout.address.fullName} · {checkout.address.phone}</AppText>
                      <AppText variant="caption">{[checkout.address.line1, checkout.address.line2, checkout.address.city, checkout.address.state, checkout.address.pincode].filter(Boolean).join(', ')}</AppText>
                      <AppText variant="caption" tone="muted">Delivery details are saved for this payment attempt.</AppText>
                    </View> : <AddressBook
                      uid={customer.uid}
                      selectedId={checkout.address?.id}
                      onSelect={checkout.setAddress}
                    />}
                  </View>
                  <View
                    style={[styles.section, !desktop && styles.mobileSection]}
                  >
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
                        accessibilityState={{
                          checked: paymentMethod === method,
                          disabled: checkout.paymentLocked,
                        }}
                        disabled={checkout.paymentLocked}
                        onPress={() => checkout.setPaymentMethod(method)}
                        style={[
                          styles.method,
                          paymentMethod === method && styles.selectedMethod,
                        ]}
                      >
                        <View
                          style={[
                            styles.methodIcon,
                            paymentMethod === method && styles.methodIconOn,
                          ]}
                        >
                          <Icon
                            color={
                              paymentMethod === method
                                ? colors.mint
                                : colors.ink
                            }
                            size={20}
                          />
                        </View>
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
                </View>
                <View
                  style={[
                    styles.summary,
                    !desktop && styles.fullWidth,
                    !desktop && styles.mobileSection,
                    desktop && stickySummary,
                  ]}
                 testID="checkout-summary">
                  <View style={styles.summaryHeading}>
                    <AppText variant="title">Your order</AppText>
                    <AppText tone="muted" variant="caption">
                      {checkout.cart.lines.reduce(
                        (sum, line) => sum + line.quantity,
                        0,
                      )}{' '}
                      items
                    </AppText>
                  </View>
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
                  <View style={{gap:10}}>
                    <AppText variant="label">Have a coupon?</AppText>
                    <TextInput accessibilityLabel="Coupon code" placeholder="Enter coupon code" autoCapitalize="characters" maxLength={32} editable={!checkout.couponLocked} value={couponDraft} onChangeText={setCouponDraft} style={{borderWidth:1,borderColor:colors.line,borderRadius:6,padding:12,color:colors.ink,backgroundColor:'#FFF'}} />
                    <Button variant="ghost" disabled={checkout.couponLocked || !couponDraft.trim()} onPress={()=>checkout.applyCoupon(couponDraft)}>Apply code</Button>
                    {checkout.couponCode ? <><AppText variant="caption">Code: {checkout.couponCode}{quote?.couponCode ? ' · Applied' : ' · Check eligibility and total'}</AppText><Button variant="ghost" disabled={checkout.couponLocked} onPress={()=>{checkout.removeCoupon();setCouponDraft('');}}>Remove code</Button></> : null}
                    {checkout.paymentLocked ? <AppText variant="caption" tone="muted">The coupon and total are fixed for this payment attempt. Use the existing payment or refresh its status.</AppText> : null}
                  </View>
                  {quote ? (
                    <View style={styles.totals}>
                      <TotalRow
                        label="Subtotal"
                        accessibilityLabel="Order subtotal"
                        amount={quote.subtotalPaise}
                      />
                      {quote.couponCode && quote.discountPaise > 0 ? <TotalRow label={`Coupon · ${quote.couponCode}`} accessibilityLabel="Coupon discount" amount={-quote.discountPaise} /> : null}
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
                        <Truck color={colors.mintInk} size={20} />
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
                        {checkout.paymentLocked
                          ? 'Total saved for this checkout attempt.'
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
                  {mode === 'test' ? (
                    <View style={styles.testBadge}>
                      <AppText tone="accent" variant="label">
                        Test mode · No live payment or shipment
                      </AppText>
                    </View>
                  ) : null}
                  {checkout.paymentLocked && !session ? <AppText tone="muted" variant="caption">The checkout response is pending. Retry Pay online or Confirm COD order to recover the same order safely. Your existing request will be reused.</AppText> : null}
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
                  {desktop ? actions : null}
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
      </ChromeScrollView>
      {showBar ? (
        <View style={styles.bar}>
          <View style={styles.barTotal}>
            <AppText tone="muted" variant="caption">
              {quote
                ? 'Total to pay'
                : 'Items subtotal · delivery calculated next'}
            </AppText>
            <AppText style={styles.barAmount}>
              {formatInr(
                quote
                  ? quote.totalPaise
                  : cartTotals(checkout.cart).subtotalPaise,
              )}
            </AppText>
          </View>
          {actions}
        </View>
      ) : null}
    </View>
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
  screen: { flex: 1, backgroundColor: colors.obsidian },
  page: { flex: 1, backgroundColor: colors.obsidian },
  scrollWithBar: { paddingBottom: 150 },
  mobileHero: { paddingVertical: spacing[5] },
  mobileHeroRow: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: spacing[4],
  },
  mobileHeroTitle: { fontSize: 30, lineHeight: 32 },
  mobileSteps: { justifyContent: 'space-between' },
  mobileSection: { borderRadius: radii.md, padding: spacing[4] },
  actions: { gap: spacing[3] },
  barActions: { flexDirection: 'row', gap: spacing[2] },
  barButton: { flex: 1, minHeight: 48, paddingHorizontal: spacing[2] },
  bar: {
    backgroundColor: colors.paper,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    gap: spacing[2],
    left: 0,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    position: 'absolute',
    right: 0,
    ...shadows.raised,
  },
  barTotal: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barAmount: {
    color: colors.ink,
    fontFamily: typography.bodyBold,
    fontSize: 20,
  },
  shell: { paddingTop: spacing[6], paddingBottom: spacing[20] },
  content: { gap: spacing[8] },
  mobileShell: { paddingTop: spacing[3] },
  mobileContent: { gap: spacing[4] },
  heading: { gap: spacing[3] },
  hero: { backgroundColor: colors.graphite, paddingVertical: spacing[8] },
  heroRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[6],
    justifyContent: 'space-between',
  },
  heroCopy: { flexBasis: 320, flexGrow: 1, gap: spacing[2], maxWidth: 640 },
  eyebrow: {
    color: colors.mint,
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
  },
  heroTitle: {
    color: colors.onDark,
    fontFamily: typography.displayHeavy,
    fontSize: 44,
    lineHeight: 46,
  },
  secureRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  secureText: { color: colors.graphiteMuted, flexShrink: 1 },
  steps: { flexDirection: 'row', gap: spacing[2] },
  stepItem: { alignItems: 'center', gap: spacing[1], width: 64 },
  stepDot: {
    alignItems: 'center',
    borderColor: colors.graphiteLine,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepDotDone: { backgroundColor: colors.mint, borderColor: colors.mint },
  stepDotActive: { borderColor: colors.mint },
  stepDotText: {
    color: colors.graphiteMuted,
    fontFamily: typography.bodyBold,
    fontSize: 12,
  },
  stepDotTextActive: { color: colors.mint },
  stepName: { color: colors.graphiteMuted, fontSize: 11.5 },
  stepNameOn: { color: colors.onDark, fontFamily: typography.bodySemibold },
  link: {
    color: colors.violet,
    fontFamily: typography.bodySemibold,
    fontSize: 14,
    minHeight: 44,
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[10] },
  stacked: { alignItems: 'stretch', flexDirection: 'column', gap: spacing[5] },
  form: { flex: 1, width: '100%', minWidth: 0, gap: spacing[5] },
  section: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing[4],
    padding: spacing[5],
    ...shadows.card,
  },
  summaryHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summary: {
    flex: 0.85,
    minWidth: 0,
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderTopColor: colors.mint,
    borderTopWidth: 4,
    borderWidth: 1,
    ...shadows.raised,
    borderRadius: radii.lg,
    padding: spacing[6],
    gap: spacing[5],
  },
  // Explicit auto sizing: on web, flex 0/1 in a stacked column collapses the height.
  fullWidth: { flexBasis: 'auto', flexGrow: 0, flexShrink: 0, width: '100%' },
  stackedItem: { alignSelf: 'stretch', flexBasis: 'auto', flexGrow: 0, flexShrink: 0, maxWidth: '100%', width: '100%' },
  card: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing[6],
    gap: spacing[4],
  },
  confirmedCard: {
    alignItems: 'flex-start',
    borderTopColor: colors.mint,
    borderTopWidth: 4,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  step: {
    width: 30,
    height: 30,
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.graphite },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    borderColor: colors.line,
    borderWidth: 1.5,
    padding: spacing[5],
    borderRadius: radii.sm,
    backgroundColor: colors.obsidianRaised,
  },
  selectedMethod: {
    backgroundColor: colors.mintSoft,
    borderColor: colors.mint,
  },
  methodCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  methodIcon: {
    alignItems: 'center',
    backgroundColor: colors.graphiteSurface,
    borderRadius: radii.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  methodIconOn: { backgroundColor: colors.graphite },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderColor: colors.line,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: {
    backgroundColor: colors.graphite,
    borderColor: colors.mint,
    borderWidth: 2,
  },
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
    backgroundColor: colors.mintSoft,
    borderRadius: radii.sm,
  },
});
