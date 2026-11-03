import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { useCartStore } from '@/features/cart/cart-store';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

import type { CatalogRepository } from './catalog-repository';
import { ProductFacts } from './ProductFacts';
import { ProductGallery } from './ProductGallery';
import { ProductTrustPanel } from './ProductTrustPanel';
import type { Product } from './types';
import { VariantPicker } from './VariantPicker';

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
  const deliveryPending = process.env.EXPO_PUBLIC_CATALOG_MODE === 'live' &&
    !product.demoContent && !selectedVariant.shipping;
  const isDesktop = breakpoint === 'desktop';
  const stickyPosition = 'sticky' as ViewStyle['position'];
  const stickyStyle: ViewStyle | undefined =
    Platform.OS === 'web' && breakpoint === 'desktop'
      ? { alignSelf: 'flex-start', position: stickyPosition, top: 24 }
      : undefined;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.page}
    >
      <PageShell style={styles.shell}>
        <View style={styles.content}>
          <View style={styles.crumbs}>
            <Link href="/shop" style={styles.crumbLink}>
              Shop
            </Link>
            <AppText tone="muted" variant="caption">
              / {titleCase(product.category)} / {product.name}
            </AppText>
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
                <AppText style={styles.brand} variant="label">
                  {product.brand}
                </AppText>
                {product.demoContent ? (
                  <View style={styles.sampleBadge}>
                    <AppText tone="muted" variant="caption">
                      Sample product
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText tone="accent" variant="caption">
                {titleCase(product.category)}
              </AppText>
              <AppText
                accessibilityRole="header"
                style={[styles.productTitle, !isDesktop && styles.mobileTitle]}
                variant="display"
              >
                {product.name}
              </AppText>
              <AppText tone="muted" variant="bodyLarge">
                {product.summary}
              </AppText>
              <View style={styles.priceBlock}>
                <Price
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
              <Button
                disabled={soldOut || deliveryPending}
                style={styles.addButton}
                onPress={() => {
                  if (onAddToCart) onAddToCart(selectedVariant.id);
                  else addProduct(product, selectedVariant.id);
                  setAdded(true);
                }}
              >
                {deliveryPending ? 'Delivery coming soon' : 'Add to cart'}
              </Button>
              {added ? (
                <AppText
                  accessibilityLiveRegion="polite"
                  variant="caption"
                  tone={cartError ? 'danger' : 'accent'}
                >
                  {cartError ?? 'Added to your bag. View Cart to continue.'}
                </AppText>
              ) : null}
              <View style={styles.tags}>
                {product.goals.slice(0, 3).map((goal) => (
                  <View key={goal} style={styles.tag}>
                    <AppText variant="caption">{titleCase(goal)}</AppText>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <ProductTrustPanel />
          <ProductFacts product={product} />
        </View>
      </PageShell>
    </ScrollView>
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
        <ActivityIndicator color={colors.lime} />
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
  page: {
    backgroundColor: colors.obsidian,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  shell: {
    paddingBottom: spacing[24],
    paddingTop: spacing[6],
  },
  content: { gap: spacing[10] },
  crumbs: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  crumbLink: {
    color: colors.lime,
    fontFamily: typography.bodySemibold,
    minHeight: 44,
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  productLayout: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[12],
  },
  stackedLayout: { flexDirection: 'column', gap: spacing[8] },
  purchase: {
    flexGrow: 0.9,
    flexShrink: 1,
    flexBasis: 0,
    gap: spacing[4],
    minWidth: 0,
    paddingTop: spacing[2],
  },
  mobilePurchase: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    minWidth: 0,
    width: '100%',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  brand: { color: colors.violet, flexShrink: 1 },
  sampleBadge: {
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  productTitle: {
    color: colors.violet,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -1,
  },
  mobileTitle: { fontSize: 42, lineHeight: 46 },
  priceBlock: {
    gap: spacing[3],
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    paddingBottom: spacing[5],
    paddingTop: spacing[2],
  },
  inventory: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  soldOutDot: { backgroundColor: colors.danger },
  addButton: { minHeight: 54, borderRadius: radii.sm },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tag: {
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
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
    backgroundColor: colors.lime,
    borderRadius: radii.xs,
    color: colors.obsidian,
    fontFamily: typography.bodyBold,
    minHeight: 44,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
});
