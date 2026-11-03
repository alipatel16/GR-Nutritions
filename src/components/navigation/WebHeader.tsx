import { useState } from 'react';
import { Link, useRouter, type Href } from 'expo-router';
import {
  Search,
  UserRound,
  ShoppingBag,
  Truck,
  Sparkles,
  MapPin,
  BadgeCheck,
} from 'lucide-react-native';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BrandMark } from '@/components/brand/BrandMark';
import { AppText } from '@/components/ui/AppText';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCartStore } from '@/features/cart/cart-store';
import { cartTotals } from '@/features/cart/cart-domain';
import { useBreakpoint } from '@/theme/use-breakpoint';
import { colors, typography } from '@/theme/tokens';
export function WebHeader() {
  const router = useRouter();
  const mobile = useBreakpoint() !== 'desktop';
  const [search, setSearch] = useState('');
  const count = useCartStore((s) => cartTotals(s.cart).itemCount);
  const { user, ready } = useAuth();
  const customerLabel = !ready
    ? 'Account'
    : user
      ? (user.displayName?.trim().split(/\s+/)[0] ??
        user.email?.split('@')[0] ??
        'Account')
      : 'Sign in';
  const submitSearch = () => {
    const normalized = search.trim();
    router.push(
      normalized
        ? { pathname: '/shop', params: { search: normalized } }
        : { pathname: '/shop' },
    );
  };
  const searchBox = (
    <View style={[styles.search, mobile && styles.mobileSearch]}>
      <Search size={18} color={colors.mineral} />
      <TextInput
        accessibilityLabel="Search products and brands"
        placeholder="Search protein, creatine, brands…"
        placeholderTextColor={colors.mineral}
        returnKeyType="search"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={submitSearch}
        style={styles.input}
      />
      {mobile ? (
        <Pressable
          accessibilityLabel="Submit product search"
          accessibilityRole="button"
          onPress={submitSearch}
          style={styles.searchSubmit}
        >
          <Search size={17} color={colors.midnight} />
        </Pressable>
      ) : null}
    </View>
  );
  return (
    <View style={styles.header}>
      <View style={styles.announcement}>
        <View style={styles.announceItem}>
          <BadgeCheck size={13} color={colors.midnight} />
          <AppText style={styles.announceText}>100% AUTHENTIC PRODUCTS</AppText>
        </View>
        {!mobile ? (
          <View style={styles.announceItem}>
            <Truck size={13} color={colors.midnight} />
            <AppText style={styles.announceText}>FREE DELIVERY ON ORDERS ABOVE ₹999</AppText>
          </View>
        ) : null}
      </View>
      <View style={[styles.main, mobile && styles.mobileMain]}>
        <Link href="/" accessibilityLabel="GR NUTRITIONS home" asChild>
          <Pressable style={styles.logo}>
            <BrandMark />
          </Pressable>
        </Link>
        {!mobile ? searchBox : null}
        <View style={styles.actions}>
          {!mobile && (
            <Link href="/account" asChild>
              <Pressable style={styles.action}>
                <MapPin size={20} color={colors.gold} />
                <AppText style={styles.actionText} variant="caption">Choose delivery address</AppText>
              </Pressable>
            </Link>
          )}
          <Link href="/account" accessibilityLabel="Account" asChild>
            <Pressable style={styles.action}>
              <UserRound size={21} color={colors.onDark} />
              {!mobile && <AppText style={styles.actionText} variant="caption">{customerLabel}</AppText>}
            </Pressable>
          </Link>
          <Link
            href="/cart"
            accessibilityLabel={
              count
                ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}`
                : 'Cart, empty'
            }
            asChild
          >
            <Pressable style={styles.cartAction}>
              <View testID="web-cart-icon-wrap" style={styles.cartIconWrap}>
                <ShoppingBag size={21} color={colors.onDark} />
                {count > 0 ? (
                  <View testID="web-cart-badge" style={styles.count}>
                    <AppText style={styles.countText}>{count}</AppText>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </Link>
        </View>
      </View>
      {mobile ? <View style={styles.mobileSearchRow}>{searchBox}</View> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.nav}
      >
        {(
          [
            ['All categories', '/shop'],
            ['Protein', '/shop?category=protein'],
            ['Pre & post workout', '/shop?category=pre-workout'],
            ['Wellness', '/shop?category=wellness'],
            ['Shop by brand', '/brands'],
            ['Shop by goal', '/shop?goal=muscle-gain'],
          ] as const
        ).map(([label, href]) => (
          <Link href={href as Href} key={label} style={styles.navLink}>
            {label}
          </Link>
        ))}
        <Link href="/advisor" asChild>
          <Pressable style={styles.coach}>
            <Sparkles size={15} color={colors.midnight} />
            <AppText style={styles.coachText}>Ask GR Coach AI</AppText>
          </Pressable>
        </Link>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.midnight,
    borderBottomColor: colors.midnightLine,
    borderBottomWidth: 1,
  },
  announcement: {
    backgroundColor: colors.gold,
    flexDirection: 'row',
    gap: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  announceItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  announceText: {
    color: colors.midnight,
    fontFamily: typography.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
    lineHeight: 16,
  },
  main: {
    width: '100%',
    maxWidth: 1336,
    alignSelf: 'center',
    paddingHorizontal: 40,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  mobileMain: { paddingHorizontal: 16, minHeight: 68, gap: 10 },
  logo: { flexDirection: 'row', alignItems: 'center' },
  search: {
    flex: 1,
    maxWidth: 520,
    backgroundColor: colors.midnightRaised,
    borderColor: colors.midnightLine,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto',
  },
  mobileSearchRow: {
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  mobileSearch: {
    maxWidth: '100%',
    marginLeft: 0,
    minHeight: 48,
    paddingRight: 5,
    width: '100%',
  },
  searchSubmit: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 7,
    height: 38,
    justifyContent: 'center',
    width: 42,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.onDark,
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 22,
    alignItems: 'center',
  },
  action: {
    minWidth: 35,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: { color: colors.onDark, fontFamily: typography.bodySemibold },
  cartAction: {
    minWidth: 35,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIconWrap: {
    position: 'relative',
  },
  count: {
    position: 'absolute',
    right: -9,
    top: -8,
    backgroundColor: colors.gold,
    borderRadius: 99,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countText: { color: colors.midnight, fontFamily: typography.bodyBold, fontSize: 10, lineHeight: 14 },
  nav: {
    gap: 30,
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 48,
    minWidth: '100%',
    justifyContent: 'center',
    borderTopColor: colors.midnightLine,
    borderTopWidth: 1,
  },
  navLink: {
    fontFamily: typography.bodySemibold,
    fontSize: 13,
    color: colors.onDarkMuted,
    paddingVertical: 14,
    textDecorationLine: 'none',
  },
  coach: {
    minHeight: 34,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 99,
    paddingHorizontal: 14,
  },
  coachText: { fontFamily: typography.bodyBold, fontSize: 12.5, color: colors.midnight },
});
