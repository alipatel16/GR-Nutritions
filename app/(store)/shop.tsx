import { useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { catalogRepository } from '@/features/catalog/supabase-catalog-repository';
import { ShopScreen } from '@/features/catalog/ShopScreen';
import {
  productCategoryValues,
  productGoalValues,
  type CatalogFilters,
  type ProductCategory,
  type ProductGoal,
} from '@/features/catalog/types';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isCategory(value?: string): value is ProductCategory {
  return Boolean(
    value && (productCategoryValues as readonly string[]).includes(value),
  );
}

function isGoal(value?: string): value is ProductGoal {
  return Boolean(
    value && (productGoalValues as readonly string[]).includes(value),
  );
}

export default function ShopRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string | string[];
    goal?: string | string[];
    search?: string | string[];
    brand?: string | string[];
  }>();

  const initialFilters = useMemo<CatalogFilters>(() => {
    const category = first(params.category);
    const goal = first(params.goal);
    const search = first(params.search);
    return {
      category: isCategory(category) ? category : undefined,
      goals: isGoal(goal) ? [goal] : undefined,
      search,
      brand: first(params.brand),
    };
  }, [params.category, params.goal, params.search, params.brand]);

  const syncFilters = useCallback(
    (filters: CatalogFilters) => {
      router.setParams({
        category: filters.category,
        goal: filters.goals?.[0],
        search: filters.search,
        brand: filters.brand,
      });
    },
    [router],
  );

  return (
    <ShopScreen
      initialFilters={initialFilters}
      onFiltersChange={syncFilters}
      repository={catalogRepository}
    />
  );
}
