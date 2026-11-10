import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { ChevronDown, Mail, MessageCircle, Package, Phone } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { InfoPage } from '@/components/layout/InfoPage';
import { AppText } from '@/components/ui/AppText';
import { emailLink, storeInfo, whatsappLink } from '@/config/store-info';
import { ContactDetails } from '@/features/info/ContactDetails';
import { helpTopics } from '@/features/info/content';
import { colors, radii, spacing, typography } from '@/theme/tokens';

// Order references are generated IDs; anything else in the URL is ignored.
const safeOrderRef = (value?: string) => (value && /^[A-Za-z0-9_-]{1,100}$/.test(value) ? value : undefined);

export default function HelpRoute() {
  const params = useLocalSearchParams<{ order?: string }>();
  const order = safeOrderRef(params.order);
  const [open, setOpen] = useState<number | null>(0);
  const topic = order
    ? `Hi GR Nutritions, I need help with my order ${order}.`
    : 'Hi GR Nutritions, I need help with an order.';
  const launch = (url: string) => void Linking.openURL(url).catch(() => undefined);

  return (
    <InfoPage
      aside={<ContactDetails topic={topic} />}
      description="Answers to common order questions, and the fastest ways to reach us about a specific order."
      eyebrow="HELP & SUPPORT"
      title="How can we help?"
    >
      <View style={styles.orderCard}>
        <View style={styles.orderHeading}>
          <View style={styles.orderIcon}>
            <Package color={colors.mint} size={20} />
          </View>
          <View style={styles.orderCopy}>
            <AppText style={styles.orderTitle}>{order ? 'Help with your order' : 'Help with an order'}</AppText>
            {order ? (
              <AppText selectable style={styles.orderRef}>Order reference: {order}</AppText>
            ) : (
              <AppText tone="muted" variant="caption">
                Tip: open the order in My orders and tap “Need help with this order?” so we get the reference automatically.
              </AppText>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="link" onPress={() => launch(whatsappLink(topic))} style={[styles.action, styles.primary]}>
            <MessageCircle color={colors.onMint} size={18} />
            <AppText style={styles.primaryText}>WhatsApp us</AppText>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => launch(`tel:+${storeInfo.phoneLinks[0]}`)} style={styles.action}>
            <Phone color={colors.ink} size={18} />
            <AppText style={styles.actionText}>Call {storeInfo.phones[0]}</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => launch(emailLink(order ? `Order ${order} - help needed` : 'Order help needed', topic))}
            style={styles.action}
          >
            <Mail color={colors.ink} size={18} />
            <AppText style={styles.actionText}>Email us</AppText>
          </Pressable>
        </View>
        <Link href="/orders" style={styles.ordersLink}>
          Go to My orders →
        </Link>
      </View>

      <View style={styles.faq}>
        <AppText style={styles.faqTitle}>Common questions</AppText>
        {helpTopics.map((item, index) => {
          const expanded = open === index;
          return (
            <View key={item.question} style={[styles.item, index > 0 && styles.itemBorder]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setOpen(expanded ? null : index)}
                style={styles.question}
              >
                <AppText style={styles.questionText}>{item.question}</AppText>
                <ChevronDown
                  color={colors.mineral}
                  size={18}
                  style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                />
              </Pressable>
              {expanded ? <AppText style={styles.answer}>{item.answer}</AppText> : null}
            </View>
          );
        })}
      </View>
    </InfoPage>
  );
}

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderTopColor: colors.mint,
    borderTopWidth: 4,
    borderWidth: 1,
    gap: spacing[4],
    padding: spacing[5],
  },
  orderHeading: { alignItems: 'center', flexDirection: 'row', gap: spacing[3] },
  orderIcon: {
    alignItems: 'center',
    backgroundColor: colors.graphite,
    borderRadius: radii.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  orderCopy: { flex: 1, gap: 2, minWidth: 0 },
  orderTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 18 },
  orderRef: { color: colors.mintInk, fontFamily: typography.bodySemibold, fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  action: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    flexBasis: 150,
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing[2],
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing[4],
  },
  primary: { backgroundColor: colors.mint, borderColor: colors.mint },
  primaryText: { color: colors.onMint, fontFamily: typography.bodyBold },
  actionText: { color: colors.ink, fontFamily: typography.bodySemibold },
  ordersLink: { color: colors.mintInk, fontFamily: typography.bodyBold, textDecorationLine: 'none' },
  faq: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  faqTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 18, paddingVertical: spacing[3] },
  item: { paddingVertical: spacing[1] },
  itemBorder: { borderTopColor: colors.line, borderTopWidth: 1 },
  question: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
    minHeight: 52,
  },
  questionText: { color: colors.ink, flex: 1, fontFamily: typography.bodySemibold, fontSize: 15 },
  answer: { color: colors.inkMuted, fontSize: 14.5, lineHeight: 23, paddingBottom: spacing[4] },
});
