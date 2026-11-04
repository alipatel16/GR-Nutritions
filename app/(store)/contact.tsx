import { InfoPage } from '@/components/layout/InfoPage';
import { storeInfo } from '@/config/store-info';
import { ContactDetails } from '@/features/info/ContactDetails';
import { StoreMap } from '@/features/info/StoreMap';

export default function ContactRoute() {
  return (
    <InfoPage
      aside={<ContactDetails />}
      description={`Call, WhatsApp or email ${storeInfo.owner} and the GR Nutritions team, or visit our store in Nikol, Ahmedabad.`}
      eyebrow="WE ARE HERE TO HELP"
      sections={[
        {
          title: 'Questions about an order?',
          paragraphs: [
            'Open My orders and tap "Need help with this order?" on the order. Your order reference is added to the message for you, so we can help faster.',
          ],
        },
        {
          title: 'Business and bulk enquiries',
          paragraphs: [
            `Gyms, trainers and bulk buyers can reach us at ${storeInfo.email} or on WhatsApp at ${storeInfo.phones[0]}.`,
          ],
        },
      ]}
      title="Contact us"
    >
      <StoreMap />
    </InfoPage>
  );
}
