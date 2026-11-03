import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, layout, radii, spacing } from '@/theme/tokens';
import { useReducedMotion } from '@/theme/use-reduced-motion';

type CarouselProps<Item> = {
  accessibilityLabel: string;
  autoAdvanceMs?: number;
  itemWidth: number;
  items: readonly Item[];
  renderItem: (item: Item, index: number) => ReactNode;
  testID?: string;
};

export function Carousel<Item>({
  accessibilityLabel,
  autoAdvanceMs,
  itemWidth,
  items,
  renderItem,
  testID,
}: CarouselProps<Item>) {
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));
  const controlLabel = useMemo(
    () => `${accessibilityLabel.charAt(0).toLowerCase()}${accessibilityLabel.slice(1)}`,
    [accessibilityLabel],
  );

  const goTo = useCallback((nextIndex: number) => {
    if (items.length === 0) {
      return;
    }

    const wrappedIndex = (nextIndex + items.length) % items.length;
    setActiveIndex(wrappedIndex);
    scrollRef.current?.scrollTo({
      animated: !reducedMotion,
      x: wrappedIndex * itemWidth,
      y: 0,
    });
  }, [itemWidth, items.length, reducedMotion]);

  useEffect(() => {
    if (!autoAdvanceMs || items.length <= 1 || reducedMotion) {
      return undefined;
    }

    const timer = setTimeout(() => goTo(safeActiveIndex + 1), autoAdvanceMs);
    return () => clearTimeout(timer);
  }, [autoAdvanceMs, goTo, items.length, reducedMotion, safeActiveIndex]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
    setActiveIndex(Math.max(0, Math.min(nextIndex, items.length - 1)));
  };

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.root} testID={testID}>
      <ScrollView
        horizontal
        onMomentumScrollEnd={handleMomentumEnd}
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
      >
        {items.map((item, index) => (
          <View key={index} style={{ width: itemWidth }}>
            {renderItem(item, index)}
          </View>
        ))}
      </ScrollView>

      {items.length > 1 ? (
        <View style={styles.navigation}>
          <Pressable
            accessibilityLabel={`Previous ${controlLabel}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => goTo(safeActiveIndex - 1)}
            style={({ pressed }) => [styles.arrow, pressed && styles.controlPressed]}
          >
            <AppText style={styles.arrowText}>‹</AppText>
          </Pressable>

          <View style={styles.indicators}>
            {items.map((_, index) => (
              <Pressable
                accessibilityLabel={`${accessibilityLabel} item ${index + 1} of ${items.length}`}
                accessibilityRole="button"
                accessibilityState={{ selected: safeActiveIndex === index }}
                hitSlop={8}
                key={index}
                onPress={() => goTo(index)}
                style={[styles.indicator, safeActiveIndex === index && styles.indicatorSelected]}
              />
            ))}
          </View>

          <Pressable
            accessibilityLabel={`Next ${controlLabel}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => goTo(safeActiveIndex + 1)}
            style={({ pressed }) => [styles.arrow, pressed && styles.controlPressed]}
          >
            <AppText style={styles.arrowText}>›</AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[3],
    width: '100%',
  },
  navigation: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
  },
  arrow: {
    alignItems: 'center',
    backgroundColor: colors.midnightRaised,
    borderColor: colors.midnightLine,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: layout.minimumPressTarget,
    justifyContent: 'center',
    width: layout.minimumPressTarget,
  },
  arrowText: {
    color: colors.gold,
    fontSize: 28,
    lineHeight: 30,
  },
  controlPressed: {
    backgroundColor: colors.midnightLine,
  },
  indicators: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  indicator: {
    backgroundColor: colors.midnightMuted,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  indicatorSelected: {
    backgroundColor: colors.gold,
    width: 24,
  },
});
