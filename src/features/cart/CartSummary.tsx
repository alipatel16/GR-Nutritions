import { BadgeCheck, LockKeyhole, Truck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/AuthProvider';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { Surface } from '@/components/ui/Surface';
import { formatInr } from '@/lib/money';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import type { CartTotals } from './types';

type CartSummaryProps = {
  totals: CartTotals;
};

export function CartSummary({ totals }: CartSummaryProps) {
  const router = useRouter();
  const { user, ready } = useAuth();
  return (
    <Surface style={styles.summary} tone="raised">
      <AppText variant="title">Order summary</AppText>
      <View style={styles.row}>
        <AppText tone="muted">
          {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
        </AppText>
        <Price
          accessibilityLabel={`Cart subtotal ${formatInr(totals.subtotalPaise)}`}
          amountPaise={totals.subtotalPaise}
          size="regular"
        />
      </View>
      <View style={styles.deliveryRow}>
        <AppText tone="muted" variant="caption">
          Delivery and final pricing
        </AppText>
        <AppText variant="caption">Calculated at checkout</AppText>
      </View>
      <Button
        disabled={!ready}
        onPress={() =>
          router.push(user ? '/checkout' : '/account?next=/checkout')
        }
      >
        {user ? 'Continue to checkout' : 'Sign in to checkout'}
      </Button>
      <AppText tone="muted" variant="caption">
        {user
          ? 'Choose from your saved delivery addresses.'
          : 'Sign in securely, then choose a delivery address.'}
      </AppText>
      <View style={styles.note}>
        {(
          [
            [LockKeyhole, 'Secure Razorpay payments or cash on delivery'],
            [Truck, 'Free delivery on orders above ₹999'],
            [BadgeCheck, 'Stock and prices re-checked before payment'],
          ] as const
        ).map(([Icon, label]) => (
          <View key={label} style={styles.noteRow}>
            <Icon color={colors.mintInk} size={16} />
            <AppText style={styles.noteText} variant="caption">
              {label}
            </AppText>
          </View>
        ))}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  summary: {
    gap: spacing[5],
    padding: spacing[6],
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing[4],
  },
  deliveryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  note: {
    backgroundColor: colors.obsidian,
    borderRadius: radii.sm,
    gap: spacing[3],
    padding: spacing[4],
  },
  noteRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  noteText: { color: colors.inkMuted, flexShrink: 1, fontFamily: typography.bodySemibold },
});
