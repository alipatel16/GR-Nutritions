import { useMemo } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';

import { PageHero } from '@/components/layout/PageHero';
import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

import { cartTotals } from './cart-domain';
import { CartLine } from './CartLine';
import { CartSummary } from './CartSummary';
import { useCartStore } from './cart-store';
import { ChromeScrollView } from '@/components/navigation/ScrollChrome';

export function CartScreen() {
  const breakpoint = useBreakpoint();
  const cart = useCartStore((state) => state.cart);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = useMemo(() => cartTotals(cart), [cart]);

  return (
    <ChromeScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.page}
    >
      <PageHero
        description="Review your selections. Delivery, COD fee and the final total are confirmed at checkout."
        eyebrow="YOUR CURRENT STACK"
        title="Cart"
      />
      <PageShell style={styles.shell}>

        {cart.lines.length === 0 ? (
          <View style={styles.empty}>
            <ShoppingBag color={colors.mintInk} size={40} />
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
    </ChromeScrollView>
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
    paddingTop: spacing[8],
  },
  empty: {
    alignItems: 'flex-start',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing[5],
    justifyContent: 'center',
    minHeight: 360,
    padding: spacing[8],
  },
  shopLink: {
    alignSelf: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: radii.xs,
    color: colors.graphite,
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
