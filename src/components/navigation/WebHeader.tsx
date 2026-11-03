import { useState } from 'react';
import { Link, useRouter, type Href } from 'expo-router';
import {
  Search,
  UserRound,
  ShoppingBag,
  Truck,
  Sparkles,
  MapPin,
  Grid2X2,
} from 'lucide-react-native';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
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
          <Search size={17} color="#FFF" />
        </Pressable>
      ) : null}
    </View>
  );
  return (
    <View style={styles.header}>
      <View style={styles.announcement}>
        <Truck size={13} color="#DCE9D9" />
        <AppText style={styles.announceText}>
          INDIA-WIDE DELIVERY · Nutrition for every goal.
        </AppText>
      </View>
      <View style={[styles.main, mobile && styles.mobileMain]}>
        <Link href="/" accessibilityLabel="GR NUTRITIONS home" asChild>
          <Pressable style={styles.logo}>
            <View style={styles.mark}>
              <AppText style={styles.markText}>GR</AppText>
            </View>
            <View>
              <AppText style={styles.brand}>GR NUTRITIONS</AppText>
              <AppText style={styles.tagline}>FUEL YOUR EVERYDAY</AppText>
            </View>
          </Pressable>
        </Link>
        {!mobile ? searchBox : null}
        <View style={styles.actions}>
          {!mobile && (
            <Link href="/account" asChild>
              <Pressable style={styles.action}>
                <MapPin size={20} color={colors.bone} />
                <AppText variant="caption">Choose delivery address</AppText>
              </Pressable>
            </Link>
          )}
          <Link href="/account" accessibilityLabel="Account" asChild>
            <Pressable style={styles.action}>
              <UserRound size={21} color={colors.bone} />
              {!mobile && <AppText variant="caption">{customerLabel}</AppText>}
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
                <ShoppingBag size={21} color={colors.bone} />
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
        {!mobile && <Grid2X2 size={16} color={colors.violet} />}
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
            <Sparkles size={15} color={colors.lime} />
            <AppText style={styles.coachText}>Find my perfect stack</AppText>
          </Pressable>
        </Link>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFF',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
  },
  announcement: {
    backgroundColor: '#183A2D',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  announceText: { color: '#EDF3EB', fontSize: 10, lineHeight: 16 },
  main: {
    width: '100%',
    maxWidth: 1336,
    alignSelf: 'center',
    paddingHorizontal: 40,
    minHeight: 91,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  mobileMain: { paddingHorizontal: 18, minHeight: 76, gap: 10 },
  logo: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  mark: {
    backgroundColor: colors.lime,
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ skewX: '-6deg' }],
  },
  markText: {
    fontFamily: typography.displayHeavy,
    fontSize: 29,
    lineHeight: 33,
    color: '#FFF',
  },
  brand: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: typography.bodyHeavy,
    letterSpacing: 0.7,
  },
  tagline: { fontSize: 7, lineHeight: 15, letterSpacing: 2.4 },
  search: {
    flex: 1,
    maxWidth: 470,
    backgroundColor: '#F5F5F1',
    borderRadius: 7,
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
    width: '100%',
  },
  searchSubmit: {
    alignItems: 'center',
    backgroundColor: colors.violet,
    borderRadius: 6,
    height: 36,
    justifyContent: 'center',
    width: 40,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.bone,
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  action: {
    minWidth: 35,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
    backgroundColor: colors.lime,
    borderRadius: 99,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: '#FFF', fontSize: 9, lineHeight: 14 },
  nav: { gap: 27, alignItems: 'center', paddingHorizontal: 16, minHeight: 48 },
  navLink: {
    fontFamily: typography.bodySemibold,
    fontSize: 11,
    color: colors.bone,
    paddingVertical: 17,
    textDecorationLine: 'none',
  },
  coach: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center' },
  coachText: { fontSize: 11, color: colors.lime },
});
