import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing } from '@/theme/tokens';

import type { CatalogFilters, ProductCategory } from './types';

const categoryLabels: Record<ProductCategory, string> = {
  protein: 'Protein',
  'pre-workout': 'Pre-workout',
  'post-workout': 'Post-workout',
  wellness: 'Wellness',
  energy: 'Energy',
  vitamins: 'Vitamins',
  'healthy-snacks': 'Healthy snacks',
};

type ActiveFiltersProps = {
  filters: CatalogFilters;
  onRemoveCategory(): void;
  onClear(): void;
};

export function ActiveFilters({
  filters,
  onRemoveCategory,
  onClear,
}: ActiveFiltersProps) {
  const hasFilters = Boolean(
    filters.brand ||
    filters.category ||
    filters.goals?.length ||
    filters.search,
  );

  if (!hasFilters) return null;

  return (
    <View style={styles.row}>
      {filters.brand ? (
        <AppText variant="caption">Brand: {filters.brand}</AppText>
      ) : null}
      {filters.category ? (
        <Pressable
          accessibilityLabel={`Remove ${categoryLabels[filters.category]} filter`}
          accessibilityRole="button"
          onPress={onRemoveCategory}
          style={styles.activeChip}
        >
          <AppText style={styles.activeChipText} variant="caption">
            {categoryLabels[filters.category]} ×
          </AppText>
        </Pressable>
      ) : null}
      {filters.search ? (
        <View style={styles.searchChip}>
          <AppText variant="caption">Search: {filters.search}</AppText>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={onClear}
        style={styles.clear}
      >
        <AppText tone="accent" variant="caption">
          Clear all filters
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  activeChip: {
    backgroundColor: colors.graphite,
    borderRadius: radii.pill,
    minHeight: 36,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  activeChipText: {
    color: colors.mint,
  },
  searchChip: {
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  clear: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[2],
  },
});
