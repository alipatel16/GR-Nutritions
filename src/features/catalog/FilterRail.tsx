import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, layout, radii, spacing, typography } from '@/theme/tokens';

import type { CatalogFilters, CatalogSort, ProductCategory } from './types';

const categories: readonly { value: ProductCategory; label: string }[] = [
  { value: 'protein', label: 'Protein' },
  { value: 'pre-workout', label: 'Pre-workout' },
  { value: 'post-workout', label: 'Post-workout' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'energy', label: 'Energy' },
  { value: 'vitamins', label: 'Vitamins' },
  { value: 'healthy-snacks', label: 'Healthy snacks' },
];

const sorts: readonly { value: CatalogSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
];

type FilterRailProps = {
  filters: CatalogFilters;
  sort: CatalogSort;
  onCategoryChange(category?: ProductCategory): void;
  onSearchChange(search: string): void;
  onSortChange(sort: CatalogSort): void;
};

export function FilterRail({
  filters,
  sort,
  onCategoryChange,
  onSearchChange,
  onSortChange,
}: FilterRailProps) {
  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Search supplements"
        onChangeText={onSearchChange}
        placeholder="Search products or ingredients"
        placeholderTextColor={colors.mineral}
        style={styles.search}
        value={filters.search ?? ''}
      />
      <ScrollView
        contentContainerStyle={styles.chips}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categories.map((category) => {
          const selected = filters.category === category.value;
          return (
            <Pressable
              accessibilityLabel={`Filter by ${category.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={category.value}
              onPress={() =>
                onCategoryChange(selected ? undefined : category.value)
              }
              style={[styles.chip, selected ? styles.chipSelected : undefined]}
            >
              <AppText
                style={selected ? styles.chipTextSelected : undefined}
                variant="label"
              >
                {category.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView
        contentContainerStyle={styles.sorts}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {sorts.map((option) => {
          const selected = sort === option.value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onSortChange(option.value)}
              style={styles.sortButton}
            >
              <AppText tone={selected ? 'accent' : 'muted'} variant="caption">
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
  },
  search: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderRadius: radii.xs,
    borderWidth: 1,
    color: colors.bone,
    fontFamily: typography.body,
    fontSize: 16,
    minHeight: layout.minimumPressTarget,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  chips: {
    gap: spacing[2],
  },
  chip: {
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: layout.minimumPressTarget,
    paddingHorizontal: spacing[4],
  },
  chipSelected: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  chipTextSelected: {
    color: colors.obsidian,
  },
  sorts: {
    gap: spacing[4],
  },
  sortButton: {
    justifyContent: 'center',
    minHeight: layout.minimumPressTarget,
  },
});
