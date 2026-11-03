import { useRef, useState } from 'react';
import type { Href } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { ProductCard } from '@/features/catalog/ProductCard';
import type { Product } from '@/features/catalog/types';
import { colors, radii, spacing } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

type ProductRailProps = {
  eyebrow: string;
  products: readonly Product[];
  title: string;
  href?: Href;
  description?: string;
};

const GAP = spacing[4];

export function ProductRail({ eyebrow, products, title, href = '/shop', description }: ProductRailProps) {
  const breakpoint = useBreakpoint();
  const cardWidth = breakpoint === 'mobile' ? 230 : breakpoint === 'tablet' ? 260 : 286;
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [offset, setOffset] = useState(0);
  const [viewport, setViewport] = useState(0);
  const [content, setContent] = useState(0);

  if (products.length === 0) return null;

  const step = Math.max(cardWidth + GAP, viewport - cardWidth / 2);
  const atStart = offset <= 4;
  const atEnd = content > 0 && offset + viewport >= content - 4;
  const scrollBy = (direction: 1 | -1) =>
    scrollRef.current?.scrollTo({ x: Math.max(0, offset + direction * step), animated: true });

  const arrows =
    breakpoint === 'mobile' ? null : (
      <View style={styles.arrows}>
        <Pressable
          accessibilityLabel={`Scroll ${title} back`}
          accessibilityRole="button"
          disabled={atStart}
          onPress={() => scrollBy(-1)}
          style={[styles.arrow, atStart && styles.arrowDisabled]}
        >
          <ChevronLeft color={colors.ink} size={20} />
        </Pressable>
        <Pressable
          accessibilityLabel={`Scroll ${title} forward`}
          accessibilityRole="button"
          disabled={atEnd}
          onPress={() => scrollBy(1)}
          style={[styles.arrow, styles.arrowForward, atEnd && styles.arrowDisabled]}
        >
          <ChevronRight color={colors.onMint} size={20} />
        </Pressable>
      </View>
    );

  return (
    <View style={styles.section}>
      <SectionHeader
        description={description}
        eyebrow={eyebrow}
        href={href}
        linkAccessibilityLabel={`View all ${title.toLowerCase()}`}
        linkLabel="View all"
        title={title}
        trailing={arrows}
      />
      <ScrollView
        contentContainerStyle={styles.rail}
        horizontal
        onContentSizeChange={(width) => setContent(width)}
        onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) =>
          setOffset(event.nativeEvent.contentOffset.x)
        }
        ref={scrollRef}
        scrollEventThrottle={32}
        showsHorizontalScrollIndicator={false}
      >
        {products.map((product) => (
          <View key={product.id} style={{ width: cardWidth }}>
            <ProductCard compact={breakpoint === 'mobile'} product={product} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[5] },
  rail: { gap: GAP, paddingBottom: spacing[3], paddingTop: spacing[1] },
  arrows: { flexDirection: 'row', gap: spacing[2] },
  arrow: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  arrowForward: { backgroundColor: colors.mint, borderColor: colors.mint },
  arrowDisabled: { opacity: 0.35 },
});
