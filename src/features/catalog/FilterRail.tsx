import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Search } from 'lucide-react-native';
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
      <View style={styles.searchWrap}>
        <Search color={colors.mineral} size={18} />
        <TextInput
          accessibilityLabel="Search supplements"
          onChangeText={onSearchChange}
          placeholder="Search products or ingredients"
          placeholderTextColor={colors.mineral}
          style={styles.search}
          value={filters.search ?? ''}
        />
      </View>
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
              style={[styles.sortButton, selected && styles.sortSelected]}
            >
              <AppText style={[styles.sortText, selected && styles.sortTextSelected]} variant="caption">
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
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.obsidian,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
  },
  search: {
    color: colors.bone,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 16,
    minHeight: 50,
    paddingVertical: spacing[3],
  },
  chips: {
    gap: spacing[2],
  },
  chip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: layout.minimumPressTarget,
    paddingHorizontal: spacing[4],
  },
  chipSelected: {
    backgroundColor: colors.graphite,
    borderColor: colors.graphite,
  },
  chipTextSelected: {
    color: colors.mint,
  },
  sorts: {
    gap: spacing[2],
  },
  sortButton: {
    borderRadius: radii.xs,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing[3],
  },
  sortSelected: { backgroundColor: colors.mintSoft },
  sortText: { color: colors.mineral, fontFamily: typography.bodySemibold },
  sortTextSelected: { color: colors.mintInk, fontFamily: typography.bodyBold },
});
