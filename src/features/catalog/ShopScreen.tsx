import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme/tokens';

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
      <PageShell style={styles.shell}>
        <View style={styles.intro}>
          <AppText tone="accent" variant="label">
            THE FULL SHELF
          </AppText>
          <AppText accessibilityRole="header" variant="display">
            FIND YOUR EVERYDAY FUEL.
          </AppText>
          <AppText style={styles.introCopy} tone="muted" variant="bodyLarge">
            Training fuel, recovery essentials, and everyday wellness—organized
            to make the right choice feel obvious.
          </AppText>
        </View>

        <FilterRail
          filters={filters}
          onCategoryChange={changeCategory}
          onSearchChange={(search) => updateFilters({ ...filters, search })}
          onSortChange={updateSort}
          sort={sort}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
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
              style={{
                backgroundColor: filters.brand === b ? colors.violet : '#FFF',
                borderColor: colors.line,
                borderWidth: 1,
                borderRadius: 99,
                padding: 12,
              }}
            >
              <AppText
                variant="caption"
                style={{ color: filters.brand === b ? '#FFF' : colors.bone }}
              >
                {b}
              </AppText>
            </Pressable>
          ))}
        </View>
        {error ? (
          <AppText tone="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}

        <View style={styles.resultHeader}>
          <AppText variant="label">
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
            <ActivityIndicator color={colors.lime} />
          </View>
        ) : result && result.items.length > 0 ? (
          <View style={{ gap: 16 }}>
            <ProductGrid products={result.items} />
            {result.items.length < result.total ? (
              <Button onPress={() => setPageSize((size) => size + 12)}>Show more products</Button>
            ) : null}
          </View>
        ) : (
          <View style={styles.empty}>
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
  shell: {
    gap: spacing[8],
    paddingBottom: spacing[24],
    paddingTop: spacing[12],
  },
  intro: {
    gap: spacing[4],
  },
  introCopy: {
    maxWidth: 700,
  },
  resultHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  loading: {
    alignItems: 'center',
    minHeight: 280,
    justifyContent: 'center',
  },
  empty: {
    borderColor: colors.line,
    borderWidth: 1,
    gap: spacing[4],
    minHeight: 280,
    justifyContent: 'center',
    padding: spacing[8],
  },
});
