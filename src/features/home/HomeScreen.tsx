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
import { useBreakpoint } from '@/theme/use-breakpoint';

import { AdvisorBanner } from './AdvisorBanner';
import { CategoryRail } from './CategoryRail';
import { GoalRail } from './GoalRail';
import { HeroCarousel } from './HeroCarousel';
import { ProductRail } from './ProductRail';

function uniqueById(products: readonly Product[]): Product[] {
  return [...new Map(products.map((product) => [product.id, product])).values()];
}

export function HomeScreen({ repository }: { repository: CatalogRepository }) {
  const mobile = useBreakpoint() === 'mobile';
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

  const merchandising = useMemo(() => {
    const bestsellers = products.slice(0, 8);
    const performance = products.filter((product) =>
      ['pre-workout', 'post-workout', 'energy'].includes(product.category),
    );
    const wellness = products.filter((product) =>
      ['wellness', 'vitamins', 'healthy-snacks'].includes(product.category),
    );
    const newest = [...products]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 8);

    return {
      bestsellers,
      performance: uniqueById(performance.length ? performance : products.slice(0, 4)),
      wellness: uniqueById(wellness.length ? wellness : products.slice(-4)),
      newest,
    };
  }, [products]);

  const brands = [...new Set(products.map((product) => product.brand))];

  return (
    <ScrollView contentContainerStyle={styles.pageContent} style={styles.page}>
      <HeroCarousel />

      <PageShell>
        <View style={[styles.trust, mobile && styles.mobileTrust]}>
          <TrustBar />
        </View>

        <View style={styles.contentStack}>
          <Reveal><CategoryRail /></Reveal>
          <Reveal delay={50}><GoalRail /></Reveal>

          {loading ? (
            <ActivityIndicator color={colors.violet} size="large" />
          ) : error ? (
            <View style={styles.stateCard}>
              <AppText tone="danger">{error}</AppText>
              <Link href="/shop" style={styles.stateLink}>Open the catalogue →</Link>
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
                  Sample collection · Illustrative products and inventory. Live products arrive from the store catalogue.
                </AppText>
              ) : null}
              <Reveal delay={80}>
                <ProductRail eyebrow="MOST-EXPLORED PICKS" products={merchandising.bestsellers} title="BESTSELLERS" />
              </Reveal>

              <Reveal delay={100}>
                <View style={styles.brandSection}>
                  <SectionHeader
                    eyebrow="TRUSTED NAMES, ONE SHELF"
                    href="/brands"
                    linkAccessibilityLabel="Browse all brands"
                    linkLabel="Browse all brands"
                    title="SHOP BY BRAND"
                  />
                  <BrandGrid brands={brands} />
                </View>
              </Reveal>

              <Reveal delay={120}>
                <ProductRail
                  eyebrow="ENERGY, ENDURANCE & RECOVERY"
                  href="/shop?category=pre-workout"
                  products={merchandising.performance}
                  title="PERFORMANCE & TRAINING"
                />
              </Reveal>

              <Reveal delay={140}><AdvisorBanner /></Reveal>

              <Reveal delay={160}>
                <ProductRail
                  eyebrow="BUILD THE DAILY FOUNDATION"
                  href="/shop?category=wellness"
                  products={merchandising.wellness}
                  title="EVERYDAY WELLNESS"
                />
              </Reveal>

              <Reveal delay={180}>
                <ProductRail
                  eyebrow="FRESH ARRIVALS"
                  href="/shop"
                  products={merchandising.newest}
                  title="NEW TO THE SHELF"
                />
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
  trust: { marginTop: -36, zIndex: 2 },
  mobileTrust: { marginTop: spacing[5] },
  contentStack: { gap: 80, paddingTop: 64 },
  stateCard: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[6],
  },
  stateLink: { color: colors.goldInk, fontFamily: typography.bodyBold, textDecorationLine: 'none' },
  brandSection: { gap: spacing[6] },
});
