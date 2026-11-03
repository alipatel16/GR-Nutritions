import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing, typography } from '@/theme/tokens';

import { ProductGrid } from '../catalog/ProductGrid';
import type { Product } from '../catalog/types';

type FeaturedCollectionProps = {
  products: Product[];
};

export function FeaturedCollection({ products }: FeaturedCollectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <AppText tone="accent" variant="label">
            TRENDING NOW
          </AppText>
          <AppText variant="heading">The current top shelf</AppText>
        </View>
        <Link
          accessibilityLabel="Shop all products"
          href="/shop"
          style={styles.link}
        >
          Shop everything →
        </Link>
      </View>
      <ProductGrid products={products} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[6],
  },
  headingRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  headingCopy: {
    gap: spacing[2],
  },
  link: {
    color: colors.lime,
    fontFamily: typography.bodyBold,
    minHeight: 44,
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
});
