import { useMemo } from 'react';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

import { cartTotals } from './cart-domain';
import { CartLine } from './CartLine';
import { CartSummary } from './CartSummary';
import { useCartStore } from './cart-store';

export function CartScreen() {
  const breakpoint = useBreakpoint();
  const cart = useCartStore((state) => state.cart);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = useMemo(() => cartTotals(cart), [cart]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.page}
    >
      <PageShell style={styles.shell}>
        <View style={styles.heading}>
          <AppText tone="accent" variant="label">
            YOUR CURRENT STACK
          </AppText>
          <AppText accessibilityRole="header" variant="display">
            Cart
          </AppText>
        </View>

        {cart.lines.length === 0 ? (
          <View style={styles.empty}>
            <AppText variant="heading">
              Your cart is ready for a fresh start
            </AppText>
            <AppText tone="muted" variant="bodyLarge">
              Browse by goal or category and add the options that fit your
              routine.
            </AppText>
            <Link
              accessibilityLabel="Browse supplements"
              href="/shop"
              style={styles.shopLink}
            >
              Browse supplements
            </Link>
          </View>
        ) : (
          <View style={styles.layout}>
            <View
              style={[
                styles.lines,
                breakpoint === 'mobile' && styles.mobileColumn,
              ]}
              testID="cart-lines"
            >
              {cart.lines.map((line) => (
                <CartLine
                  key={line.variantId}
                  line={line}
                  onRemove={() => removeItem(line.variantId)}
                  onUpdateQuantity={(quantity) =>
                    updateItem(line.variantId, quantity)
                  }
                />
              ))}
            </View>
            <View
              style={[
                styles.summary,
                breakpoint === 'mobile' && styles.mobileColumn,
              ]}
              testID="cart-summary"
            >
              <CartSummary totals={totals} />
            </View>
          </View>
        )}
      </PageShell>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.obsidian,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  shell: {
    gap: spacing[8],
    paddingBottom: spacing[24],
    paddingTop: spacing[10],
  },
  heading: {
    gap: spacing[2],
  },
  empty: {
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing[5],
    justifyContent: 'center',
    minHeight: 360,
    padding: spacing[8],
  },
  shopLink: {
    alignSelf: 'flex-start',
    backgroundColor: colors.lime,
    borderRadius: radii.xs,
    color: colors.obsidian,
    fontFamily: typography.bodyBold,
    minHeight: 44,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  layout: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  lines: {
    flex: 1.6,
    minWidth: 300,
  },
  summary: {
    flex: 0.8,
    minWidth: 280,
  },
  mobileColumn: {
    flexBasis: '100%',
    minWidth: 0,
    width: '100%',
  },
});
