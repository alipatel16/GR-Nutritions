import { BadgeCheck, FlaskConical, LockKeyhole, Truck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

const items = [
  { Icon: BadgeCheck, title: '100% authentic', body: 'Sourced from brands & authorised importers' },
  { Icon: FlaskConical, title: 'Full label facts', body: 'Ingredients, usage & warnings on every product' },
  { Icon: Truck, title: 'Free delivery over ₹999', body: 'Address-checked shipping across India' },
  { Icon: LockKeyhole, title: 'Secure checkout', body: 'Razorpay payments or cash on delivery' },
] as const;

export function TrustBar({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const mobile = useBreakpoint() === 'mobile';
  const dark = tone === 'dark';
  return (
    <View
      accessibilityLabel="Why shop with GR Nutritions"
      style={[styles.bar, dark ? styles.dark : styles.light, mobile && styles.mobileBar]}
    >
      {items.map(({ Icon, title, body }) => (
        <View key={title} style={[styles.item, mobile && styles.mobileItem]}>
          <View style={[styles.icon, dark && styles.darkIcon]}>
            <Icon color={dark ? colors.gold : colors.goldInk} size={20} />
          </View>
          <View style={styles.copy}>
            <AppText style={[styles.title, { color: dark ? colors.onDark : colors.ink }]}>{title}</AppText>
            <AppText style={[styles.body, { color: dark ? colors.onDarkMuted : colors.mineral }]}>{body}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[5],
    padding: spacing[5],
  },
  light: { backgroundColor: colors.paper, borderColor: colors.line },
  dark: { backgroundColor: colors.midnightRaised, borderColor: colors.midnightLine },
  mobileBar: { flexWrap: 'wrap', gap: spacing[4], padding: spacing[4] },
  item: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing[3], minWidth: 0 },
  mobileItem: { flexBasis: '46%', minWidth: 140 },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.goldSoft,
    borderRadius: radii.sm,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  darkIcon: { backgroundColor: '#1B2540' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontFamily: typography.bodyBold, fontSize: 13, lineHeight: 18 },
  body: { fontSize: 11.5, lineHeight: 16 },
});
