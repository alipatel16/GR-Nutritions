import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { TrustBar } from '@/components/commerce/TrustBar';
import { PageShell } from '@/components/layout/PageShell';
import { StoreFooter } from '@/components/layout/StoreFooter';
import { Reveal } from '@/components/motion/Reveal';
import { AppText } from '@/components/ui/AppText';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BrandGrid } from '@/features/catalog/BrandGrid';
import type { CatalogRepository } from '@/features/catalog/catalog-repository';
import type { Product } from '@/features/catalog/types';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { AdvisorBanner } from './AdvisorBanner';
import { CategoryRail } from './CategoryRail';
import { GoalGrid } from './GoalGrid';
import { HeroCarousel } from './HeroCarousel';
import { ProductRail } from './ProductRail';

function uniqueById(products: readonly Product[]): Product[] {
  return [...new Map(products.map((product) => [product.id, product])).values()];
}

function inStock(product: Product) {
  return product.variants.filter((variant) => variant.stockAvailable > 0);
}

function lowestPrice(product: Product) {
  const variants = inStock(product);
  return Math.min(...(variants.length ? variants : product.variants).map((v) => v.price.amountPaise));
}

function bestSaving(product: Product) {
  return Math.max(
    0,
    ...inStock(product).map((v) => (v.mrp.amountPaise - v.price.amountPaise) / v.mrp.amountPaise),
  );
}

export function HomeScreen({ repository }: { repository: CatalogRepository }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    void repository
      .list({ pageSize: Number.MAX_SAFE_INTEGER }, 'featured')
      .then((result) => {
        if (current) setProducts(result.items);
      })
      .catch(() => {
        if (current) setError('The shelf could not load. Please try Shop again.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [repository]);

  // Every shelf is derived from the live catalogue, so empty shelves simply hide.
  const shelves = useMemo(() => {
    const byCategory = (...categories: string[]) =>
      products.filter((product) => categories.includes(product.category));
    const performance = byCategory('pre-workout', 'post-workout', 'energy');
    const wellness = byCategory('wellness', 'vitamins', 'healthy-snacks');
    return {
      bestsellers: products.slice(0, 10),
      deals: [...products]
        .filter((product) => bestSaving(product) > 0)
        .sort((a, b) => bestSaving(b) - bestSaving(a))
        .slice(0, 10),
      protein: byCategory('protein'),
      performance: uniqueById(performance.length ? performance : products.slice(0, 4)),
      budget: [...products]
        .filter((product) => inStock(product).length && lowestPrice(product) <= 99900)
        .sort((a, b) => lowestPrice(a) - lowestPrice(b)),
      wellness: uniqueById(wellness.length ? wellness : products.slice(-4)),
      plant: products.filter((product) =>
        product.dietaryTags.some((tag) => tag === 'vegetarian' || tag === 'vegan'),
      ),
      newest: [...products]
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
        .slice(0, 10),
    };
  }, [products]);

  const brands = [...new Set(products.map((product) => product.brand))];

  return (
    <ScrollView contentContainerStyle={styles.pageContent} style={styles.page}>
      <HeroCarousel />
      <GoalGrid />

      <PageShell>
        <View style={styles.trust}>
          <TrustBar />
        </View>

        <View style={styles.contentStack}>
          <Reveal>
            <CategoryRail />
          </Reveal>

          {loading ? (
            <ActivityIndicator color={colors.mintInk} size="large" />
          ) : error ? (
            <View style={styles.stateCard}>
              <AppText tone="danger">{error}</AppText>
              <Link href="/shop" style={styles.stateLink}>
                Open the catalogue →
              </Link>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.stateCard}>
              <AppText variant="title">The shelf is being restocked.</AppText>
              <AppText tone="muted">Browse by category or ask GR Coach for help.</AppText>
            </View>
          ) : (
            <>
              {products.some((product) => product.demoContent) ? (
                <AppText tone="muted" variant="caption">
                  Sample collection · Illustrative products and inventory. Live products arrive from
                  the store catalogue.
                </AppText>
              ) : null}

              <Reveal delay={60}>
                <ProductRail eyebrow="MOST-EXPLORED PICKS" products={shelves.bestsellers} title="Bestsellers" />
              </Reveal>

              <Reveal delay={80}>
                <ProductRail
                  description="The biggest discounts off MRP on in-stock options right now."
                  eyebrow="SAVE MORE"
                  products={shelves.deals}
                  title="Top deals"
                />
              </Reveal>

              <Reveal delay={100}>
                <View style={styles.brandSection}>
                  <SectionHeader
                    eyebrow="TRUSTED NAMES, ONE SHELF"
                    href="/brands"
                    linkAccessibilityLabel="Browse all brands"
                    linkLabel="Browse all brands"
                    title="Shop by brand"
                  />
                  <BrandGrid brands={brands} />
                </View>
              </Reveal>

              <Reveal delay={120}>
                <ProductRail
                  eyebrow="WHEY, ISOLATE AND PLANT"
                  href="/shop?category=protein"
                  products={shelves.protein}
                  title="Protein powders"
                />
              </Reveal>

              <Reveal delay={140}>
                <ProductRail
                  eyebrow="ENERGY, ENDURANCE AND RECOVERY"
                  href="/shop?category=pre-workout"
                  products={shelves.performance}
                  title="Performance & training"
                />
              </Reveal>

              <Reveal delay={160}>
                <AdvisorBanner />
              </Reveal>

              <Reveal delay={180}>
                <ProductRail
                  description="Quality picks with an option at ₹999 or less."
                  eyebrow="BUDGET FRIENDLY"
                  products={shelves.budget}
                  title="Under ₹999"
                />
              </Reveal>

              <Reveal delay={200}>
                <ProductRail
                  eyebrow="BUILD THE DAILY FOUNDATION"
                  href="/shop?category=wellness"
                  products={shelves.wellness}
                  title="Everyday wellness"
                />
              </Reveal>

              <Reveal delay={220}>
                <ProductRail
                  eyebrow="VEGETARIAN AND VEGAN"
                  products={shelves.plant}
                  title="Veg-friendly picks"
                />
              </Reveal>

              <Reveal delay={240}>
                <ProductRail eyebrow="FRESH ARRIVALS" products={shelves.newest} title="New to the shelf" />
              </Reveal>
            </>
          )}
        </View>
      </PageShell>
      <StoreFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.obsidian, flex: 1 },
  pageContent: { paddingBottom: 0 },
  trust: { marginTop: spacing[8] },
  contentStack: { gap: 64, paddingTop: 56 },
  stateCard: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[6],
  },
  stateLink: { color: colors.mintInk, fontFamily: typography.bodyBold, textDecorationLine: 'none' },
  brandSection: { gap: spacing[6] },
});
