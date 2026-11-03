import { catalogRepository } from '@/features/catalog/supabase-catalog-repository';
import { HomeScreen } from '@/features/home/HomeScreen';

export default function StoreIndex() {
  return <HomeScreen repository={catalogRepository} />;
}
