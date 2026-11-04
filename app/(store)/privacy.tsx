import { InfoPage } from '@/components/layout/InfoPage';
import { storeInfo } from '@/config/store-info';
import { privacySections } from '@/features/info/content';

export default function PrivacyRoute() {
  return (
    <InfoPage
      description="What personal data we collect, why we need it, who we share it with, and the rights you have."
      eyebrow="LEGAL"
      sections={privacySections}
      title="Privacy policy"
      updated={storeInfo.policiesUpdated}
    />
  );
}
