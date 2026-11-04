import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { emailLink, fullAddress, mapsLink, storeInfo, whatsappLink } from '@/config/store-info';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type ContactDetailsProps = {
  // Prefilled WhatsApp/email text, e.g. an order reference from the Help page.
  topic?: string;
};

function Row({ icon, label, value, onPress, accessibilityLabel }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const body = (
    <>
      <View style={styles.icon}>{icon}</View>
      <View style={styles.copy}>
        <AppText style={styles.label}>{label}</AppText>
        <AppText style={[styles.value, onPress && styles.linkValue]}>{value}</AppText>
      </View>
    </>
  );
  return onPress ? (
    <Pressable accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`} accessibilityRole="link" onPress={onPress} style={styles.row}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.row}>{body}</View>
  );
}

export function ContactDetails({ topic = 'Hi GR Nutritions, I have a question.' }: ContactDetailsProps) {
  const open = (url: string) => void Linking.openURL(url).catch(() => undefined);
  return (
    <View style={styles.card}>
      <AppText style={styles.title}>Talk to us</AppText>
      <AppText tone="muted" variant="caption">
        {storeInfo.owner} and the GR Nutritions team usually reply within one working day.
      </AppText>
      <Row
        accessibilityLabel={`WhatsApp ${storeInfo.phones[0]}`}
        icon={<MessageCircle color={colors.mint} size={18} />}
        label="WhatsApp"
        onPress={() => open(whatsappLink(topic))}
        value={storeInfo.phones[0]}
      />
      {storeInfo.phones.map((phone, index) => (
        <Row
          accessibilityLabel={`Call ${phone}`}
          icon={<Phone color={colors.mint} size={18} />}
          key={phone}
          label={index === 0 ? 'Call' : 'Call (alternate)'}
          onPress={() => open(`tel:+${storeInfo.phoneLinks[index]}`)}
          value={phone}
        />
      ))}
      <Row
        accessibilityLabel={`Email ${storeInfo.email}`}
        icon={<Mail color={colors.mint} size={18} />}
        label="Email"
        onPress={() => open(emailLink(topic.length > 80 ? 'GR Nutritions enquiry' : topic, topic))}
        value={storeInfo.email}
      />
      <Row
        accessibilityLabel="Open store location in Google Maps"
        icon={<MapPin color={colors.mint} size={18} />}
        label="Store"
        onPress={() => open(mapsLink())}
        value={fullAddress}
      />
      <Row icon={<Clock color={colors.mint} size={18} />} label="Support hours" value={storeInfo.supportHours} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.graphite,
    borderRadius: radii.lg,
    gap: spacing[3],
    padding: spacing[5],
  },
  title: { color: colors.onDark, fontFamily: typography.bodyBold, fontSize: 20 },
  row: {
    alignItems: 'center',
    backgroundColor: colors.graphiteRaised,
    borderColor: colors.graphiteLine,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[3],
  },
  icon: {
    alignItems: 'center',
    backgroundColor: '#22272D',
    borderRadius: radii.sm,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  copy: { flex: 1, minWidth: 0 },
  label: { color: colors.graphiteMuted, fontSize: 12 },
  value: { color: colors.onDark, fontFamily: typography.bodySemibold, fontSize: 14, lineHeight: 20 },
  linkValue: { color: colors.mint },
});
