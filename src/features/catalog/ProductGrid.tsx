import { StyleSheet, View } from 'react-native';

import { useBreakpoint } from '@/theme/use-breakpoint';

import { ProductCard } from './ProductCard';
import type { Product } from './types';

type ProductGridProps = {
  products: Product[];
};

export function ProductGrid({ products }: ProductGridProps) {
  const breakpoint = useBreakpoint();
  const columns =
    breakpoint === 'desktop' ? 4 : breakpoint === 'tablet' ? 3 : 2;
  const width = `${100 / columns}%` as `${number}%`;

  return (
    <View style={styles.grid}>
      {products.map((product) => (
        <View key={product.id} style={[styles.cell, { width }]}>
          <ProductCard compact={breakpoint === 'mobile'} product={product} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  cell: {
    padding: 6,
  },
});
