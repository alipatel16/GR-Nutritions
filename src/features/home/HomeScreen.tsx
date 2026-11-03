import { useEffect, useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Headphones, Leaf, ShieldCheck, Truck } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { PageShell } from '@/components/layout/PageShell';
import { StoreFooter } from '@/components/layout/StoreFooter';
import { Reveal } from '@/components/motion/Reveal';
import { AppText } from '@/components/ui/AppText';
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

const trustItems = [
  { Icon: ShieldCheck, title: 'Shop with confidence', body: 'Clear product and sourcing information' },
  { Icon: Truck, title: 'Delivery across India', body: 'Address-aware delivery at checkout' },
  { Icon: Leaf, title: 'Every routine covered', body: 'Performance through daily wellness' },
  { Icon: Headphones, title: 'Help when you need it', body: 'Guided discovery with GR Coach' },
] as const;

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
          {trustItems.map(({ Icon, title, body }) => (
            <View key={title} style={[styles.trustItem, mobile && styles.mobileTrustItem]}>
              <View style={styles.trustIcon}><Icon color={colors.violet} size={21} /></View>
              <View style={styles.trustCopy}>
                <AppText style={styles.trustTitle}>{title}</AppText>
                <AppText style={styles.trustBody}>{body}</AppText>
              </View>
            </View>
          ))}
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
                  <View style={styles.sectionHeading}>
                    <View>
                      <AppText style={styles.kicker}>TRUSTED NAMES, ONE SHELF</AppText>
                      <AppText variant="heading">SHOP BY BRAND</AppText>
                    </View>
                    <Link accessibilityLabel="Browse all brands" href="/brands" style={styles.viewAll}>
                      Browse all brands →
                    </Link>
                  </View>
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
  pageContent: { paddingBottom: 64 },
  trust: {
    backgroundColor: colors.obsidianRaised,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[5],
    paddingVertical: spacing[6],
  },
  mobileTrust: { flexWrap: 'wrap', gap: spacing[4] },
  trustItem: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing[3], minWidth: 0 },
  mobileTrustItem: { flexBasis: '46%', minWidth: 145 },
  trustIcon: {
    alignItems: 'center',
    backgroundColor: '#E8EFE8',
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  trustCopy: { flex: 1, minWidth: 0 },
  trustTitle: { fontFamily: typography.bodyBold, fontSize: 11, lineHeight: 16 },
  trustBody: { color: colors.mineral, fontSize: 9, lineHeight: 14 },
  contentStack: { gap: 64, paddingTop: 48 },
  stateCard: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[3],
    padding: spacing[6],
  },
  stateLink: { color: colors.violet, fontFamily: typography.bodyBold, textDecorationLine: 'none' },
  brandSection: { gap: spacing[5] },
  sectionHeading: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  kicker: {
    color: colors.mineral,
    fontFamily: typography.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
    lineHeight: 17,
    marginBottom: spacing[1],
  },
  viewAll: {
    color: colors.violet,
    fontFamily: typography.bodyBold,
    minHeight: 44,
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
});
