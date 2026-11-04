import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { BadgeCheck, LockKeyhole, Sparkles, Truck } from 'lucide-react-native';

import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { useCartStore } from '@/features/cart/cart-store';
import { formatInr } from '@/lib/money';
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

import type { CatalogRepository } from './catalog-repository';
import { ProductFacts } from './ProductFacts';
import { ProductGallery } from './ProductGallery';
import { ProductTrustPanel } from './ProductTrustPanel';
import type { Product } from './types';
import { VariantPicker } from './VariantPicker';
import { ChromeScrollView } from '@/components/navigation/ScrollChrome';

type ProductDetailScreenProps = {
  product: Product;
  onAddToCart?(variantId: string): void;
};

function titleCase(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ProductDetailScreen({
  product,
  onAddToCart,
}: ProductDetailScreenProps) {
  const breakpoint = useBreakpoint();
  const addProduct = useCartStore((state) => state.addProduct);
  const cartError = useCartStore((s) => s.lastError);
  const [added, setAdded] = useState(false);
  const initialVariant = useMemo(
    () =>
      product.variants.find((variant) => variant.stockAvailable > 0) ??
      product.variants[0],
    [product.variants],
  );
  const [selectedId, setSelectedId] = useState(initialVariant.id);
  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedId) ??
    initialVariant;
  const soldOut = selectedVariant.stockAvailable === 0;
  const isDesktop = breakpoint === 'desktop';
  const stickyPosition = 'sticky' as ViewStyle['position'];
  const stickyStyle: ViewStyle | undefined =
    Platform.OS === 'web' && breakpoint === 'desktop'
      ? { alignSelf: 'flex-start', position: stickyPosition, top: 24 }
      : undefined;

  const addToCart = () => {
    if (onAddToCart) onAddToCart(selectedVariant.id);
    else addProduct(product, selectedVariant.id);
    setAdded(true);
  };

  // On phones the price and Add to cart stay pinned above the tab bar.
  const buyButton = (
    <Button
      disabled={soldOut}
      style={[styles.addButton, !isDesktop && styles.barButton]}
      onPress={addToCart}
    >
      Add to cart
    </Button>
  );

  return (
    <View style={styles.screen}>
      <ChromeScrollView
        contentContainerStyle={[styles.scrollContent, !isDesktop && styles.scrollWithBar]}
        style={styles.page}
      >
        <PageShell style={[styles.shell, !isDesktop && styles.mobileShell]}>
          <View style={styles.content}>
            <View style={styles.crumbs}>
              <Link href="/shop" style={styles.crumbLink}>
                Shop
              </Link>
              <AppText style={styles.crumbText} variant="caption">
                /
              </AppText>
              <AppText numberOfLines={1} style={styles.crumbText} variant="caption">
                {titleCase(product.category)}
              </AppText>
              {isDesktop ? (
                <AppText numberOfLines={1} style={styles.crumbCurrent} variant="caption">
                  / {product.name}
                </AppText>
              ) : null}
            </View>

            <View
              style={[styles.productLayout, !isDesktop && styles.stackedLayout]}
            >
              <ProductGallery
                key={product.id}
                media={product.media}
                productName={product.name}
                demoContent={product.demoContent}
              />
              <View
                style={[
                  styles.purchase,
                  !isDesktop && styles.mobilePurchase,
                  stickyStyle,
                ]}
                testID="product-purchase"
              >
                <View style={styles.metaRow}>
                  <View style={styles.brandPill}>
                    <BadgeCheck color={colors.mint} size={13} />
                    <AppText style={styles.brand} variant="label">
                      {product.brand}
                    </AppText>
                  </View>
                  <AppText style={styles.category} variant="caption">
                    {titleCase(product.category)}
                  </AppText>
                  {product.demoContent ? (
                    <View style={styles.sampleBadge}>
                      <AppText tone="muted" variant="caption">
                        Sample product
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText
                  accessibilityRole="header"
                  style={[styles.productTitle, !isDesktop && styles.mobileTitle]}
                >
                  {product.name}
                </AppText>
                <AppText style={styles.summary}>{product.summary}</AppText>

                <View style={styles.priceBlock}>
                  <Price
                    accessibilityLabel={`Selected price ${formatInr(selectedVariant.price.amountPaise)}`}
                    amountPaise={selectedVariant.price.amountPaise}
                    mrpPaise={selectedVariant.mrp.amountPaise}
                    size="large"
                  />
                  <View style={styles.inventory}>
                    <View
                      style={[styles.stockDot, soldOut && styles.soldOutDot]}
                    />
                    <AppText
                      tone={soldOut ? 'danger' : 'muted'}
                      variant="caption"
                    >
                      {soldOut
                        ? 'This option is currently sold out.'
                        : `${selectedVariant.stockAvailable} ${selectedVariant.stockAvailable === 1 ? 'unit' : 'units'} ${product.demoContent ? 'in sample inventory' : 'available'}`}
                    </AppText>
                  </View>
                </View>

                <VariantPicker
                  onSelect={(variantId) => {
                    setSelectedId(variantId);
                    setAdded(false);
                  }}
                  selectedId={selectedVariant.id}
                  variants={product.variants}
                />

                {isDesktop ? buyButton : null}
                {added ? (
                  <View
                    style={[styles.addedNote, cartError ? styles.addedError : null]}
                  >
                    <AppText
                      accessibilityLiveRegion="polite"
                      variant="caption"
                      tone={cartError ? 'danger' : 'success'}
                    >
                      {cartError ?? 'Added to your bag. View Cart to continue.'}
                    </AppText>
                    {!cartError ? (
                      <Link href="/cart" style={styles.addedLink}>
                        View cart →
                      </Link>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.assurances}>
                  {(
                    [
                      [BadgeCheck, 'Authentic', 'Genuine brand stock'],
                      [Truck, 'Free delivery', 'On orders above ₹999'],
                      [LockKeyhole, 'Secure checkout', 'Razorpay or COD'],
                    ] as const
                  ).map(([Icon, label, note]) => (
                    <View key={label} style={styles.assurance}>
                      <View style={styles.assuranceIcon}>
                        <Icon color={colors.mintInk} size={16} />
                      </View>
                      <AppText style={styles.assuranceTitle}>{label}</AppText>
                      <AppText style={styles.assuranceNote}>{note}</AppText>
                    </View>
                  ))}
                </View>

                {product.goals.length ? (
                  <View style={styles.tags}>
                    <AppText style={styles.tagsLabel} variant="caption">
                      Good for
                    </AppText>
                    {product.goals.slice(0, 3).map((goal) => (
                      <View key={goal} style={styles.tag}>
                        <AppText style={styles.tagText} variant="caption">
                          {titleCase(goal)}
                        </AppText>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Link
                  asChild
                  href={{ pathname: '/advisor', params: { product: product.slug } }}
                >
                  <Pressable style={styles.coachLink}>
                    <Sparkles color={colors.mint} size={16} />
                    <AppText style={styles.coachLinkText}>
                      Not sure? Compare options with GR Coach
                    </AppText>
                  </Pressable>
                </Link>
              </View>
            </View>

            <ProductTrustPanel />
            <ProductFacts product={product} />
          </View>
        </PageShell>
      </ChromeScrollView>

      {!isDesktop ? (
        <View style={styles.buyBar}>
          <View style={styles.buyBarPrice}>
            <AppText numberOfLines={1} style={styles.buyBarLabel} variant="caption">
              {selectedVariant.label}
            </AppText>
            <AppText style={styles.buyBarAmount}>
              {formatInr(selectedVariant.price.amountPaise)}
            </AppText>
          </View>
          {buyButton}
        </View>
      ) : null}
    </View>
  );
}

type ProductDetailRouteContentProps = {
  repository: CatalogRepository;
  slug: string;
};

type LookupState = {
  slug: string | null;
  product: Product | null;
  error?: boolean;
};

export function ProductDetailRouteContent({
  repository,
  slug,
}: ProductDetailRouteContentProps) {
  const [lookup, setLookup] = useState<LookupState>({
    slug: null,
    product: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    void repository
      .getBySlug(slug)
      .then((product) => {
        if (isCurrent) {
          setLookup({ slug, product });
        }
      })
      .catch(() => {
        if (isCurrent) setLookup({ slug, product: null, error: true });
      });

    return () => {
      isCurrent = false;
    };
  }, [repository, slug, attempt]);

  if (lookup.slug !== slug) {
    return (
      <View accessibilityLabel="Loading product" style={styles.routeLoading}>
        <ActivityIndicator color={colors.mint} size="large" />
      </View>
    );
  }

  if (!lookup.product) {
    return (
      <View style={styles.missing}>
        <AppText accessibilityRole="header" variant="heading">
          {lookup.error
            ? 'This product could not load'
            : "We couldn't find that product"}
        </AppText>
        {lookup.error ? (
          <Button
            variant="ghost"
            onPress={() => {
              setLookup({ slug: null, product: null });
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        ) : null}
        <AppText tone="muted">
          It may be unpublished, unavailable, or the link may be incomplete.
        </AppText>
        <Link
          accessibilityLabel="Back to shop"
          href="/shop"
          style={styles.backLink}
        >
          Back to shop
        </Link>
      </View>
    );
  }

  return <ProductDetailScreen product={lookup.product} />;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.obsidian, flex: 1 },
  page: {
    backgroundColor: colors.obsidian,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollWithBar: { paddingBottom: 96 },
  shell: {
    paddingBottom: spacing[24],
    paddingTop: spacing[5],
  },
  mobileShell: { paddingBottom: spacing[10], paddingTop: spacing[3] },
  content: { gap: spacing[10] },
  crumbs: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 32,
  },
  crumbLink: {
    color: colors.mintInk,
    fontFamily: typography.bodySemibold,
    fontSize: 13,
    textDecorationLine: 'none',
  },
  crumbText: { color: colors.mineral, flexShrink: 0 },
  crumbCurrent: { color: colors.mineral, flexShrink: 1 },
  productLayout: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[10],
  },
  stackedLayout: { flexDirection: 'column', gap: spacing[5] },
  purchase: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexGrow: 0.9,
    flexShrink: 1,
    flexBasis: 0,
    gap: spacing[5],
    minWidth: 0,
    padding: spacing[8],
    ...shadows.card,
  },
  mobilePurchase: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    minWidth: 0,
    padding: spacing[5],
    width: '100%',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  brandPill: {
    alignItems: 'center',
    backgroundColor: colors.graphite,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
  },
  brand: { color: colors.onDark, fontSize: 12, letterSpacing: 0.4, lineHeight: 16 },
  category: {
    backgroundColor: colors.mintSoft,
    borderRadius: radii.pill,
    color: colors.mintInk,
    fontFamily: typography.bodySemibold,
    overflow: 'hidden',
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
  },
  sampleBadge: {
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  productTitle: {
    color: colors.ink,
    fontFamily: typography.bodyBold,
    fontSize: 34,
    letterSpacing: -0.6,
    lineHeight: 40,
  },
  mobileTitle: { fontSize: 24, letterSpacing: -0.3, lineHeight: 30 },
  summary: { color: colors.inkMuted, fontSize: 15, lineHeight: 23 },
  priceBlock: {
    backgroundColor: colors.graphiteSurface,
    borderRadius: radii.md,
    gap: spacing[2],
    padding: spacing[4],
  },
  inventory: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  soldOutDot: { backgroundColor: colors.danger },
  addButton: { borderRadius: radii.sm, minHeight: 56 },
  barButton: { flex: 1, minHeight: 52 },
  addedNote: {
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radii.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'space-between',
    padding: spacing[3],
  },
  addedError: { backgroundColor: colors.dangerSoft },
  addedLink: {
    color: colors.mintInk,
    fontFamily: typography.bodyBold,
    fontSize: 13,
    textDecorationLine: 'none',
  },
  assurances: {
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
  },
  assurance: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[3],
  },
  assuranceIcon: {
    alignItems: 'center',
    backgroundColor: colors.mintSoft,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    marginBottom: 2,
    width: 32,
  },
  assuranceTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  assuranceNote: { color: colors.mineral, fontSize: 11, lineHeight: 15, textAlign: 'center' },
  tags: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tagsLabel: { color: colors.mineral, fontFamily: typography.bodySemibold },
  tag: {
    backgroundColor: colors.graphiteSurface,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
  },
  tagText: { color: colors.inkMuted, fontFamily: typography.bodySemibold },
  coachLink: {
    alignItems: 'center',
    backgroundColor: colors.graphite,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 48,
    paddingHorizontal: spacing[4],
  },
  coachLinkText: { color: colors.onDark, flexShrink: 1, fontFamily: typography.bodySemibold, fontSize: 13.5 },
  buyBar: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing[4],
    left: 0,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    position: 'absolute',
    right: 0,
    ...shadows.raised,
  },
  buyBarPrice: { flexShrink: 1, maxWidth: '45%', minWidth: 0 },
  buyBarLabel: { color: colors.mineral },
  buyBarAmount: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 20, lineHeight: 26 },
  routeLoading: {
    alignItems: 'center',
    backgroundColor: colors.obsidian,
    flex: 1,
    justifyContent: 'center',
  },
  missing: {
    backgroundColor: colors.obsidian,
    flex: 1,
    gap: spacing[4],
    justifyContent: 'center',
    padding: spacing[8],
  },
  backLink: {
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
});
