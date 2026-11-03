import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { BadgeCheck, SearchX } from 'lucide-react-native';

import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens';

import { ActiveFilters } from './ActiveFilters';
import type { CatalogRepository } from './catalog-repository';
import { FilterRail } from './FilterRail';
import { ProductGrid } from './ProductGrid';
import type {
  CatalogFilters,
  CatalogResult,
  CatalogSort,
  ProductCategory,
} from './types';

type ShopScreenProps = {
  repository: CatalogRepository;
  initialFilters?: CatalogFilters;
  onFiltersChange?(filters: CatalogFilters): void;
};

function serializableFilters(filters: CatalogFilters): CatalogFilters {
  const next: CatalogFilters = {};
  if (filters.category) next.category = filters.category;
  if (filters.goals?.length) next.goals = filters.goals;
  if (filters.search?.trim()) next.search = filters.search;
  if (filters.brand) next.brand = filters.brand;
  return next;
}

export function ShopScreen({
  repository,
  initialFilters = {},
  onFiltersChange,
}: ShopScreenProps) {
  const initialFilterState = serializableFilters(initialFilters);
  const initialFilterKey = JSON.stringify(initialFilterState);
  const [filters, setFilters] = useState<CatalogFilters>(initialFilterState);
  const [previousInitialFilterKey, setPreviousInitialFilterKey] =
    useState(initialFilterKey);
  const [sort, setSort] = useState<CatalogSort>('featured');
  const [pageSize, setPageSize] = useState(12);
  const [result, setResult] = useState<CatalogResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [brands, setBrands] = useState<string[]>([]);
  if (previousInitialFilterKey !== initialFilterKey) {
    setPreviousInitialFilterKey(initialFilterKey);
    setFilters(initialFilterState);
    setIsLoading(true);
    setError('');
  }
  useEffect(() => {
    let current = true;
    void repository
      .list({ pageSize: Number.MAX_SAFE_INTEGER })
      .then((r) => {
        if (current) setBrands([...new Set(r.items.map((p) => p.brand))]);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [repository]);

  useEffect(() => {
    let isCurrent = true;

    void repository
      .list({ ...filters, pageSize }, sort)
      .then((nextResult) => {
        if (isCurrent) {
          setResult(nextResult);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setError('Products could not load. Please check your connection.');
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [filters, pageSize, repository, sort]);

  function updateFilters(nextFilters: CatalogFilters) {
    const next = serializableFilters(nextFilters);
    setIsLoading(true);
    setPageSize(12);
    setFilters(next);
    onFiltersChange?.(next);
  }

  function updateSort(nextSort: CatalogSort) {
    setIsLoading(true);
    setSort(nextSort);
  }

  function changeCategory(category?: ProductCategory) {
    updateFilters({ ...filters, category });
  }

  const count = result?.total ?? 0;

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.page}
    >
      <View style={styles.banner}>
        <PageShell>
          <View style={styles.intro}>
            <View style={styles.eyebrowRow}>
              <BadgeCheck color={colors.mint} size={15} />
              <AppText style={styles.eyebrow}>
                THE FULL SHELF · 100% AUTHENTIC
              </AppText>
            </View>
            <AppText
              accessibilityRole="header"
              tone="inverse"
              variant="display"
            >
              FIND YOUR EVERYDAY FUEL.
            </AppText>
            <AppText style={styles.introCopy} variant="bodyLarge">
              Training fuel, recovery essentials, and everyday
              wellness—organized to make the right choice feel obvious.
            </AppText>
          </View>
        </PageShell>
      </View>
      <PageShell style={styles.shell}>
        <View style={styles.filterPanel}>
          <FilterRail
            filters={filters}
            onCategoryChange={changeCategory}
            onSearchChange={(search) => updateFilters({ ...filters, search })}
            onSortChange={updateSort}
            sort={sort}
          />
          {brands.length ? (
            <AppText style={styles.filterLabel}>BRANDS</AppText>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {brands.map((b) => (
              <Pressable
                key={b}
                accessibilityRole="button"
                accessibilityLabel={`Filter by brand ${b}`}
                accessibilityState={{ selected: filters.brand === b }}
                onPress={() =>
                  updateFilters({
                    ...filters,
                    brand: filters.brand === b ? undefined : b,
                  })
                }
                style={[
                  styles.brandChip,
                  filters.brand === b && styles.brandChipSelected,
                ]}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.brandChipText,
                    filters.brand === b && styles.brandChipTextSelected,
                  ]}
                >
                  {b}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
        {error ? (
          <AppText tone="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}

        <View style={styles.resultHeader}>
          <AppText style={styles.count} variant="label">
            {count} {count === 1 ? 'product' : 'products'}
          </AppText>
          <ActiveFilters
            filters={filters}
            onClear={() => updateFilters({})}
            onRemoveCategory={() => changeCategory(undefined)}
          />
        </View>

        {isLoading ? (
          <View accessibilityLabel="Loading products" style={styles.loading}>
            <ActivityIndicator color={colors.mint} size="large" />
          </View>
        ) : result && result.items.length > 0 ? (
          <View style={{ gap: 16 }}>
            <ProductGrid products={result.items} />
            {result.items.length < result.total ? (
              <Button onPress={() => setPageSize((size) => size + 12)}>
                Show more products
              </Button>
            ) : null}
          </View>
        ) : (
          <View style={styles.empty}>
            <SearchX color={colors.mintInk} size={34} />
            <AppText variant="heading">No products match those filters</AppText>
            <AppText tone="muted">
              Keep the filters you want, or clear them to reopen the full shelf.
            </AppText>
          </View>
        )}
      </PageShell>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.obsidian,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  banner: {
    backgroundColor: colors.graphite,
    borderBottomColor: colors.mint,
    borderBottomWidth: 3,
    paddingBottom: spacing[12],
    paddingTop: spacing[12],
  },
  shell: {
    gap: spacing[6],
    paddingBottom: spacing[24],
    paddingTop: spacing[8],
  },
  intro: {
    gap: spacing[4],
  },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  eyebrow: {
    color: colors.mint,
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  introCopy: {
    color: colors.onDarkMuted,
    maxWidth: 700,
  },
  filterPanel: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[4],
    padding: spacing[5],
    ...shadows.card,
  },
  filterLabel: {
    color: colors.mineral,
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  brandChip: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing[4],
  },
  brandChipSelected: {
    backgroundColor: colors.graphite,
    borderColor: colors.graphite,
  },
  brandChipText: { color: colors.ink, fontFamily: typography.bodySemibold },
  brandChipTextSelected: { color: colors.mint },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  count: { fontSize: 15 },
  loading: {
    alignItems: 'center',
    minHeight: 280,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[4],
    minHeight: 280,
    justifyContent: 'center',
    padding: spacing[8],
  },
});
