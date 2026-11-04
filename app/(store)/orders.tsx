import { useEffect, useRef, useState } from 'react';
import { Link, Redirect } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import { CreditCard, Package, Truck, Wallet } from 'lucide-react-native';
import { storeRequest } from '@/lib/store-api';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  checkoutErrorMessage,
  orderStatusLabel,
} from '@/features/checkout/checkout-service';
import {
  customerOrderSchema,
  customerOrdersSchema,
  httpsTrackingUrl,
  type CustomerOrder,
} from '@/features/checkout/customer-orders';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { PageHero } from '@/components/layout/PageHero';
import { PageShell } from '@/components/layout/PageShell';
import { formatInr } from '@/lib/money';
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';
import { ChromeScrollView } from '@/components/navigation/ScrollChrome';

const progressSteps = ['Confirmed', 'Preparing', 'Shipped', 'Delivered'] as const;

// Visual progress only; the order status itself is unchanged.
function progressStep(status: string): number {
  return ({ paid: 1, cod_confirmed: 1, processing: 2, shipped: 3, delivered: 4 } as Record<string, number>)[status] ?? 0;
}

type StatusTone = 'good' | 'waiting' | 'bad';
function statusTone(status: string): StatusTone {
  if (['paid', 'cod_confirmed', 'processing', 'shipped', 'delivered'].includes(status)) return 'good';
  if (['cancelled', 'refunded', 'payment_failed', 'payment_expired', 'expired'].includes(status)) return 'bad';
  return 'waiting';
}

function formatPlaced(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Orders() {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <ActivityIndicator
        accessibilityLabel="Loading account"
        color={colors.violet}
      />
    );
  if (!user) return <Redirect href="/account?next=/orders" />;
  return <OrdersContent key={user.uid} />;
}
function OrdersContent() {
  const desktop = useBreakpoint() === 'desktop';
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    void storeRequest('orders.list')
      .then((value) => {
        if (current) setOrders(customerOrdersSchema.parse(value));
      })
      .catch((failure) => {
        if (current)
          setError(
            checkoutErrorMessage(
              failure,
              'Could not load your orders. Please try again.',
            ),
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [attempt]);
  async function refreshOrder(id: string) {
    if (refreshing || !orders.some((order) => order.id === id)) return;
    setRefreshing(id);
    setError('');
    try {
      const updated = customerOrderSchema.parse(
        await storeRequest('shipment.sync', { orderId: id }),
      );
      if (updated.id !== id) throw new Error('Order response mismatch');
      if (mounted.current)
        setOrders((previous) =>
          previous.map((order) =>
            order.id === id ? { ...order, ...updated } : order,
          ),
        );
    } catch (failure) {
      if (mounted.current)
        setError(
          checkoutErrorMessage(
            failure,
            'This order could not be refreshed. Please try again.',
          ),
        );
    } finally {
      if (mounted.current) setRefreshing('');
    }
  }
  async function openTracking(value: unknown) {
    const url = httpsTrackingUrl(value);
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      if (mounted.current)
        setError('The tracking page could not open. Please try again.');
    }
  }
  return (
    <ChromeScrollView style={styles.page}>
      <PageHero
        description="Order updates and delivery tracking, all in one place."
        eyebrow="GR STORE / YOUR ACCOUNT"
        title="Your orders."
      />
      <PageShell style={styles.shell}>
        <View style={styles.content}>
          {error ? (
            <View style={styles.error}>
              <AppText accessibilityRole="alert" tone="danger">
                {error}
              </AppText>
              <Button
                variant="ghost"
                disabled={loading}
                onPress={() => {
                  setLoading(true);
                  setError('');
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </Button>
            </View>
          ) : null}
          {loading ? (
            <ActivityIndicator
              accessibilityLabel="Loading your orders"
              color={colors.violet}
            />
          ) : !orders.length && !error ? (
            <View style={styles.empty}>
              <Package color={colors.violet} size={40} strokeWidth={1.25} />
              <AppText variant="title">Your next routine starts here.</AppText>
              <AppText tone="muted">
                Your orders will appear here when you place your first order.
              </AppText>
              <Link href="/shop" style={styles.link}>
                Explore the store →
              </Link>
            </View>
          ) : (
            <>
              <AppText tone="muted" variant="caption">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </AppText>
              {orders.map((order) => {
                const tone = statusTone(order.status);
                const step = progressStep(order.status);
                const placed = formatPlaced(order.createdAt);
                return (
                  <View key={order.id} style={styles.card}>
                    <View style={styles.cardHeading}>
                      <View style={styles.orderIdentity}>
                        <AppText tone="muted" variant="caption">
                          ORDER REFERENCE
                        </AppText>
                        <AppText selectable variant="label">
                          {order.id}
                        </AppText>
                        {placed ? (
                          <AppText tone="muted" variant="caption">
                            Placed {placed}
                          </AppText>
                        ) : null}
                      </View>
                      <View style={styles.badges}>
                        <View style={[styles.statusPill, styles[`pill_${tone}`]]}>
                          <View style={[styles.statusDot, styles[`dot_${tone}`]]} />
                          <AppText style={[styles.status, styles[`text_${tone}`]]}>
                            {orderStatusLabel(order.status)}
                          </AppText>
                        </View>
                        {order.mode === 'test' ? (
                          <View style={styles.badge}>
                            <AppText tone="accent" variant="caption">
                              Test order · Will not ship
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {step > 0 ? (
                      <View
                        accessible
                        accessibilityLabel={`Order progress: ${progressSteps[step - 1]}, step ${step} of 4`}
                        style={styles.progress}
                      >
                        {progressSteps.map((name, index) => {
                          const reached = index < step;
                          return (
                            <View
                              accessibilityElementsHidden
                              importantForAccessibility="no-hide-descendants"
                              key={name}
                              style={styles.progressStep}
                            >
                              <View style={styles.progressTrack}>
                                <View style={[styles.progressBar, reached && styles.progressReached]} />
                              </View>
                              <AppText style={[styles.progressLabel, reached && styles.progressLabelReached]}>
                                {name}
                              </AppText>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}

                    <View style={[styles.columns, !desktop && styles.stacked]}>
                      <View style={styles.details}>
                        {order.items?.length ? (
                          <View style={styles.items}>
                            {order.items.map((item, index) => (
                              <View key={`${item.productName}-${index}`} style={styles.itemRow}>
                                <View style={styles.itemIcon}>
                                  <Package color={colors.mintInk} size={16} />
                                </View>
                                <AppText style={styles.itemName} variant="caption">
                                  {item.productName} × {item.quantity}
                                </AppText>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        <View style={styles.totals}>
                          {order.shippingPaise != null ? (
                            <AppText tone="muted" variant="caption">
                              Delivery {formatInr(order.shippingPaise)}
                              {order.codFeePaise
                                ? ` · COD fee ${formatInr(order.codFeePaise)}`
                                : ''}
                            </AppText>
                          ) : null}
                          <AppText style={styles.total} variant="label">
                            {order.paymentMethod === 'cod' &&
                            !['cancelled', 'refunded', 'delivered'].includes(
                              order.status,
                            )
                              ? 'Amount due on delivery: '
                              : 'Order total: '}
                            {formatInr(order.totalPaise)}
                          </AppText>
                          <View style={styles.payment}>
                            {order.paymentMethod === 'razorpay' ? (
                              <CreditCard color={colors.mineral} size={14} />
                            ) : (
                              <Wallet color={colors.mineral} size={14} />
                            )}
                            <AppText tone="muted" variant="caption">
                              {order.paymentMethod === 'cod'
                                ? 'Cash on delivery'
                                : order.paymentMethod === 'razorpay'
                                  ? 'Online payment · Razorpay'
                                  : 'Payment details unavailable'}
                            </AppText>
                          </View>
                        </View>
                      </View>
                      <View style={[styles.tracking, !desktop && styles.fullWidth]}>
                        <View style={styles.trackingHeading}>
                          <Truck color={colors.mint} size={18} />
                          <AppText style={styles.trackingTitle} variant="label">Delivery tracking</AppText>
                        </View>
                        {order.tracking ? (
                          <>
                            {order.tracking.courierName ? (
                              <AppText style={styles.trackingMuted} variant="caption">
                                {order.tracking.courierName}
                              </AppText>
                            ) : null}
                            {order.tracking.awb ? (
                              <View>
                                <AppText style={styles.trackingMuted} variant="caption">
                                  Tracking number
                                </AppText>
                                <AppText selectable style={styles.trackingValue} variant="label">
                                  {order.tracking.awb}
                                </AppText>
                              </View>
                            ) : null}
                            {order.tracking.status ? (
                              <AppText style={styles.trackingMuted} variant="caption">
                                Shipment update:{' '}
                                {order.tracking.status.replace(/_/g, ' ')}
                              </AppText>
                            ) : null}
                            {order.tracking.url ? (
                              <Button
                                accessibilityLabel={`Track order ${order.id}`}
                                onPress={() => openTracking(order.tracking?.url)}
                              >
                                Track delivery
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          <AppText style={styles.trackingMuted} variant="caption">
                            {order.mode === 'test'
                              ? 'Test orders do not create a delivery.'
                              : 'Tracking will appear here once your order has a shipment.'}
                          </AppText>
                        )}
                        <Link
                          accessibilityLabel={`Get help with order ${order.id}`}
                          href={{ pathname: '/help', params: { order: order.id } }}
                          style={styles.helpLink}
                        >
                          Need help with this order?
                        </Link>
                        <Button
                          variant="inverse"
                          accessibilityLabel={`Refresh order ${order.id}`}
                          disabled={Boolean(refreshing)}
                          loading={refreshing === order.id}
                          onPress={() => refreshOrder(order.id)}
                        >
                          Refresh order status
                        </Button>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </PageShell>
    </ChromeScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.obsidian },
  shell: { paddingTop: spacing[8], paddingBottom: spacing[20] },
  content: { gap: spacing[4] },
  card: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing[5],
    gap: spacing[5],
    ...shadows.card,
  },
  cardHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  orderIdentity: { gap: 2, flexShrink: 1, minWidth: 0 },
  badges: { alignItems: 'flex-end', gap: spacing[2] },
  statusPill: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  pill_good: { backgroundColor: colors.successSoft },
  pill_waiting: { backgroundColor: '#FFF4D6' },
  pill_bad: { backgroundColor: colors.dangerSoft },
  statusDot: { borderRadius: 4, height: 8, width: 8 },
  dot_good: { backgroundColor: colors.success },
  dot_waiting: { backgroundColor: '#B7791F' },
  dot_bad: { backgroundColor: colors.danger },
  status: { fontFamily: typography.bodyBold, fontSize: 13 },
  text_good: { color: colors.success },
  text_waiting: { color: '#8A5A00' },
  text_bad: { color: colors.danger },
  badge: {
    backgroundColor: colors.mintSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  progress: { flexDirection: 'row', gap: spacing[2] },
  progressStep: { flex: 1, gap: spacing[2] },
  progressTrack: { backgroundColor: colors.line, borderRadius: 3, height: 6, overflow: 'hidden' },
  progressBar: { height: 6 },
  progressReached: { backgroundColor: colors.mint, width: '100%' },
  progressLabel: { color: colors.mineral, fontSize: 11.5, lineHeight: 16 },
  progressLabelReached: { color: colors.ink, fontFamily: typography.bodySemibold },
  columns: { flexDirection: 'row', gap: spacing[6], alignItems: 'stretch' },
  stacked: { flexDirection: 'column', gap: spacing[4] },
  details: { flex: 1, minWidth: 0, width: '100%', gap: spacing[4] },
  items: { gap: spacing[2] },
  itemRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[3] },
  itemIcon: {
    alignItems: 'center',
    backgroundColor: colors.mintSoft,
    borderRadius: radii.sm,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  itemName: { color: colors.ink, flex: 1, fontSize: 14 },
  totals: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: spacing[1],
    paddingTop: spacing[3],
  },
  total: { color: colors.ink, fontSize: 16 },
  payment: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  tracking: {
    flex: 0.8,
    minWidth: 0,
    backgroundColor: colors.graphite,
    borderRadius: radii.md,
    padding: spacing[4],
    gap: spacing[3],
  },
  fullWidth: { width: '100%', flex: 0 },
  trackingHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  trackingTitle: { color: colors.onDark },
  trackingMuted: { color: colors.graphiteMuted },
  trackingValue: { color: colors.onDark },
  helpLink: {
    color: colors.mint,
    fontFamily: typography.bodyBold,
    fontSize: 14,
    paddingVertical: spacing[1],
    textDecorationLine: 'none',
  },
  empty: {
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[12],
  },
  link: {
    backgroundColor: colors.mint,
    borderRadius: radii.xs,
    color: colors.onMint,
    fontFamily: typography.bodyBold,
    marginTop: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    gap: spacing[3],
    padding: spacing[4],
  },
});
