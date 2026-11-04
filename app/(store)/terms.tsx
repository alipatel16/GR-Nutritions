import { InfoPage } from '@/components/layout/InfoPage';
import { storeInfo } from '@/config/store-info';
import { termsSections } from '@/features/info/content';

export default function TermsRoute() {
  return (
    <InfoPage
      description="The rules for ordering from GR Nutritions: payments, delivery, cash on delivery, cancellations and refunds."
      eyebrow="LEGAL"
      sections={termsSections}
      title="Terms & conditions"
      updated={storeInfo.policiesUpdated}
    />
  );
}
