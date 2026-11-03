import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProductCard } from '@/features/catalog/ProductCard';
import type { Product } from '@/features/catalog/types';
import { colors, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

type ProductRailProps = {
  eyebrow: string;
  products: readonly Product[];
  title: string;
  href?: Href;
};

export function ProductRail({ eyebrow, products, title, href = '/shop' }: ProductRailProps) {
  const breakpoint = useBreakpoint();
  const cardWidth = breakpoint === 'mobile' ? 278 : breakpoint === 'tablet' ? 300 : 292;

  if (products.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View>
          <AppText style={styles.eyebrow}>{eyebrow}</AppText>
          <AppText variant="heading">{title}</AppText>
        </View>
        <Link accessibilityLabel={`View all ${title.toLowerCase()}`} href={href} style={styles.link}>
          View all →
        </Link>
      </View>
      <ScrollView
        contentContainerStyle={styles.rail}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {products.map((product) => (
          <View key={product.id} style={{ width: cardWidth }}>
            <ProductCard product={product} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[5] },
  headingRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.lime,
    fontFamily: typography.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
    lineHeight: 17,
    marginBottom: spacing[1],
  },
  link: {
    color: colors.violet,
    fontFamily: typography.bodyBold,
    minHeight: 44,
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  rail: { gap: spacing[4], paddingBottom: spacing[2] },
});
