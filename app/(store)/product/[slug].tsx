import { useLocalSearchParams } from 'expo-router';

import { catalogRepository } from '@/features/catalog/supabase-catalog-repository';
import { ProductDetailRouteContent } from '@/features/catalog/ProductDetailScreen';

export default function ProductRoute() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const resolvedSlug = Array.isArray(slug) ? (slug[0] ?? '') : (slug ?? '');

  return (
    <ProductDetailRouteContent
      repository={catalogRepository}
      slug={resolvedSlug}
    />
  );
}
