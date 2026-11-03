import { useEffect, useRef, useState } from 'react';
import { Link, Redirect } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Package, Truck } from 'lucide-react-native';
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
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

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
    <ScrollView style={styles.page}>
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
            orders.map((order) => (
              <View key={order.id} style={styles.card}>
                <View style={styles.cardHeading}>
                  <View style={styles.orderIdentity}>
                    <AppText tone="muted" variant="caption">
                      ORDER REFERENCE
                    </AppText>
                    <AppText selectable variant="label">
                      {order.id}
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
                <View style={[styles.columns, !desktop && styles.stacked]}>
                  <View style={styles.details}>
                    <AppText style={styles.status} variant="title">
                      {orderStatusLabel(order.status)}
                    </AppText>
                    {order.items?.map((item, index) => (
                      <AppText
                        key={`${item.productName}-${index}`}
                        tone="muted"
                        variant="caption"
                      >
                        {item.productName} × {item.quantity}
                      </AppText>
                    ))}
                    <AppText variant="label">
                      {order.paymentMethod === 'cod' &&
                      !['cancelled', 'refunded', 'delivered'].includes(
                        order.status,
                      )
                        ? 'Amount due on delivery: '
                        : 'Order total: '}
                      {formatInr(order.totalPaise)}
                    </AppText>
                    <AppText tone="muted" variant="caption">
                      {order.paymentMethod === 'cod'
                        ? 'Cash on delivery'
                        : order.paymentMethod === 'razorpay'
                          ? 'Online payment · Razorpay'
                          : 'Payment details unavailable'}
                    </AppText>
                    {order.shippingPaise != null ? (
                      <AppText tone="muted" variant="caption">
                        Delivery {formatInr(order.shippingPaise)}
                        {order.codFeePaise
                          ? ` · COD fee ${formatInr(order.codFeePaise)}`
                          : ''}
                      </AppText>
                    ) : null}
                  </View>
                  <View style={[styles.tracking, !desktop && styles.fullWidth]}>
                    <View style={styles.trackingHeading}>
                      <Truck color={colors.violet} size={20} />
                      <AppText variant="label">Delivery tracking</AppText>
                    </View>
                    {order.tracking ? (
                      <>
                        {order.tracking.courierName ? (
                          <AppText tone="muted" variant="caption">
                            {order.tracking.courierName}
                          </AppText>
                        ) : null}
                        {order.tracking.awb ? (
                          <View>
                            <AppText tone="muted" variant="caption">
                              Tracking number
                            </AppText>
                            <AppText selectable variant="label">
                              {order.tracking.awb}
                            </AppText>
                          </View>
                        ) : null}
                        {order.tracking.status ? (
                          <AppText tone="muted" variant="caption">
                            Shipment update:{' '}
                            {order.tracking.status.replace(/_/g, ' ')}
                          </AppText>
                        ) : null}
                        {order.tracking.url ? (
                          <Button
                            variant="ghost"
                            accessibilityLabel={`Track order ${order.id}`}
                            onPress={() => openTracking(order.tracking?.url)}
                          >
                            Track delivery
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <AppText tone="muted" variant="caption">
                        {order.mode === 'test'
                          ? 'Test orders do not create a delivery.'
                          : 'Tracking will appear here once your order has a shipment.'}
                      </AppText>
                    )}
                    <Button
                      variant="ghost"
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
            ))
          )}
        </View>
      </PageShell>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.obsidian },
  shell: { paddingTop: spacing[8], paddingBottom: spacing[20] },
  content: { gap: spacing[6] },
  heading: { gap: spacing[3], marginBottom: spacing[3] },
  title: { color: colors.violet },
  card: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderLeftColor: colors.mint,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[6],
    gap: spacing[6],
  },
  cardHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  orderIdentity: { gap: spacing[2], flexShrink: 1, minWidth: 0 },
  badge: {
    backgroundColor: colors.mintSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  columns: { flexDirection: 'row', gap: spacing[8], alignItems: 'flex-start' },
  stacked: { flexDirection: 'column', gap: spacing[5] },
  details: { flex: 1, minWidth: 0, width: '100%', gap: spacing[3] },
  status: { color: colors.violet },
  tracking: {
    flex: 0.7,
    minWidth: 0,
    backgroundColor: colors.graphiteSurface,
    borderRadius: radii.sm,
    padding: spacing[5],
    gap: spacing[3],
  },
  fullWidth: { width: '100%', flex: 0 },
  trackingHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  empty: {
    alignItems: 'flex-start',
    gap: spacing[5],
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[8],
  },
  link: {
    color: colors.violet,
    fontFamily: typography.bodySemibold,
    minHeight: 44,
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  error: { gap: spacing[3] },
});
