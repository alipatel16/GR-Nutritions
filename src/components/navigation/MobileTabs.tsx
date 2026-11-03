import { Link, usePathname, type Href } from 'expo-router';
import {
  Home,
  Grid2X2,
  Sparkles,
  ShoppingBag,
  UserRound,
} from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { useCartStore } from '@/features/cart/cart-store';
import { cartTotals } from '@/features/cart/cart-domain';
import { colors } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';
const tabs = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/shop', label: 'Shop', Icon: Grid2X2 },
  { href: '/advisor', label: 'Coach', Icon: Sparkles },
  { href: '/cart', label: 'Cart', Icon: ShoppingBag },
  { href: '/account', label: 'Account', Icon: UserRound },
];
export function MobileTabs() {
  const breakpoint = useBreakpoint();
  const path = usePathname();
  const count = useCartStore((s) => cartTotals(s.cart).itemCount);
  if (Platform.OS === 'web' && breakpoint === 'desktop') return null;
  return (
    <View accessibilityLabel="Primary navigation" style={styles.tabs}>
      {tabs.map(({ href, label, Icon }) => (
        <Link
          key={label}
          href={href as Href}
          accessibilityLabel={
            label === 'Cart'
              ? count
                ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}`
                : 'Cart, empty'
              : label
          }
          asChild
        >
          <Pressable style={styles.tab}>
            <View
              testID={label === 'Cart' ? 'mobile-cart-icon-wrap' : undefined}
              style={label === 'Cart' ? styles.cartIconWrap : undefined}
            >
              <Icon
                size={21}
                color={path === href ? colors.violet : colors.mineral}
              />
              {label === 'Cart' && count > 0 ? (
                <View testID="mobile-cart-badge" style={styles.badge}>
                  <AppText style={styles.badgeText}>{count}</AppText>
                </View>
              ) : null}
            </View>
            <AppText
              style={[styles.label, path === href && { color: colors.violet }]}
            >
              {label}
            </AppText>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  tabs: {
    backgroundColor: '#FFF',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingTop: 9,
    paddingBottom: 14,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: { fontSize: 10, lineHeight: 15, color: colors.mineral },
  cartIconWrap: { position: 'relative' },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.lime,
    borderColor: '#FFF',
    borderRadius: 99,
    borderWidth: 1.5,
    height: 16,
    justifyContent: 'center',
    minWidth: 16,
    position: 'absolute',
    right: -9,
    top: -7,
  },
  badgeText: { color: '#FFF', fontSize: 8, lineHeight: 11 },
});
