import type { Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProductCard } from '@/features/catalog/ProductCard';
import type { Product } from '@/features/catalog/types';
import { spacing } from '@/theme/tokens';
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
      <SectionHeader
        eyebrow={eyebrow}
        href={href}
        linkAccessibilityLabel={`View all ${title.toLowerCase()}`}
        linkLabel="View all"
        title={title}
      />
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
  section: { gap: spacing[6] },
  rail: { gap: spacing[4], paddingBottom: spacing[4], paddingTop: spacing[1] },
});
