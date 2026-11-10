import { Link, type Href } from 'expo-router';
import { BadgeCheck, LockKeyhole, Sparkles, Truck } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

import { storeInfo } from '@/config/store-info';
import { useBreakpoint } from '@/theme/use-breakpoint';

import { PageShell } from './PageShell';
import { BrandMark } from '../brand/BrandMark';
import { AppText } from '../ui/AppText';

const columns = [
  {
    title: 'SHOP',
    links: [
      ['Protein', '/shop?category=protein', 'Footer protein'],
      ['Pre-workout', '/shop?category=pre-workout', 'Footer pre workout'],
      ['Wellness', '/shop?category=wellness', 'Footer wellness'],
      ['All brands', '/brands', 'Footer brands'],
    ],
  },
  {
    title: 'MY GR',
    links: [
      ['Account', '/account', 'Footer account'],
      ['Orders', '/orders', 'Footer orders'],
      ['Cart', '/cart', 'Footer cart'],
      ['Shop all', '/shop', 'Footer shop all'],
    ],
  },
  {
    title: 'GUIDANCE',
    links: [
      ['Ask GR Coach', '/advisor', 'Footer GR Coach'],
      ['Shop by goal', '/shop?goal=muscle-gain', 'Footer shop by goal'],
      ['Everyday wellness', '/shop?goal=everyday-wellness', 'Footer everyday wellness'],
      ['Recovery', '/shop?goal=recovery', 'Footer recovery'],
    ],
  },
  {
    title: 'COMPANY',
    links: [
      ['About us', '/about', 'Footer about us'],
      ['Contact us', '/contact', 'Footer contact us'],
      ['Help & support', '/help', 'Footer help'],
      ['Terms & conditions', '/terms', 'Footer terms'],
      ['Privacy policy', '/privacy', 'Footer privacy'],
    ],
  },
] as const;

export function StoreFooter() {
  const phone = useBreakpoint() === 'mobile';
  return (
    <View style={[styles.footer, phone && styles.mobileFooter]}>
      <PageShell>
        <View style={[styles.top, phone && styles.mobileTop]}>
          <View style={[styles.brandBlock, phone && styles.mobileBrandBlock]}>
            <BrandMark />
            <AppText style={styles.brandCopy}>
              Genuine sports nutrition and everyday wellness from the brands athletes trust,
              delivered across India from Ahmedabad.
            </AppText>
            <Link accessibilityLabel="Open GR Coach from footer" href="/advisor" style={styles.coachLink}>
              <Sparkles color={colors.graphite} size={16} />
              <AppText style={styles.coachText}>GR Coach</AppText>
            </Link>
          </View>

          {/* Phones get an even two-column grid aligned to the left edge. */}
          <View style={[styles.columns, phone && styles.mobileColumns]}>
            {columns.map((column) => (
              <View key={column.title} style={[styles.column, phone && styles.mobileColumn]}>
                <AppText style={styles.columnTitle}>{column.title}</AppText>
                {column.links.map(([label, href, accessibilityLabel]) => (
                  <Link
                    accessibilityLabel={accessibilityLabel}
                    href={href as Href}
                    key={label}
                    style={styles.link}
                  >
                    {label}
                  </Link>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.assurances, phone && styles.mobileAssurances]}>
          {([
            [BadgeCheck, 'Authentic brand products'],
            [LockKeyhole, 'Secure Razorpay checkout'],
            [Truck, 'Free delivery above ₹999'],
          ] as const).map(([Icon, label]) => (
            <View key={label} style={styles.assurance}>
              <Icon color={colors.mint} size={16} />
              <AppText style={styles.assuranceText}>{label}</AppText>
            </View>
          ))}
        </View>

        <View style={[styles.bottom, phone && styles.mobileBottom]}>
          <AppText style={styles.small}>© {new Date().getFullYear()} GR Nutritions</AppText>
          <View style={styles.bottomLinks}>
            <Link href="/terms" style={styles.smallLink}>Terms</Link>
            <Link href="/privacy" style={styles.smallLink}>Privacy</Link>
            <Link href="/contact" style={styles.smallLink}>{storeInfo.phones[0]}</Link>
            <Link href="/admin" style={styles.smallLink}>Store administration</Link>
          </View>
        </View>
      </PageShell>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileFooter: { marginTop: 48, paddingBottom: 28, paddingTop: 36 },
  mobileTop: { flexDirection: 'column', gap: 32 },
  mobileBrandBlock: { gap: spacing[4], maxWidth: '100%', minWidth: 0 },
  mobileColumns: { flexBasis: 'auto', flexGrow: 0, flexShrink: 0, gap: 0, justifyContent: 'flex-start', minWidth: 0, width: '100%' },
  mobileColumn: { gap: spacing[3], marginBottom: 28, minWidth: 0, paddingRight: spacing[3], width: '50%' },
  mobileAssurances: { flexDirection: 'column', gap: spacing[3], marginTop: 32, paddingTop: spacing[5] },
  mobileBottom: { alignItems: 'flex-start', flexDirection: 'column', gap: spacing[3] },
  footer: {
    backgroundColor: colors.graphite,
    borderTopColor: colors.mint,
    borderTopWidth: 3,
    marginTop: 80,
    paddingBottom: 40,
    paddingTop: 56,
  },
  top: { flexDirection: 'row', flexWrap: 'wrap', gap: 56, justifyContent: 'space-between' },
  brandBlock: { gap: spacing[5], maxWidth: 360, minWidth: 250 },
  brandCopy: { color: colors.onDarkMuted, fontSize: 14, lineHeight: 22 },
  coachLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: 99,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 44,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  coachText: { color: colors.graphite, fontFamily: typography.bodyBold, fontSize: 13 },
  columns: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 40, justifyContent: 'flex-end', minWidth: 280 },
  column: { gap: spacing[3], minWidth: 130 },
  columnTitle: { color: colors.mint, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 2 },
  link: { color: colors.onDark, fontFamily: typography.body, fontSize: 14, lineHeight: 22, textDecorationLine: 'none' },
  assurances: {
    borderTopColor: colors.graphiteLine,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginTop: 48,
    paddingTop: spacing[6],
  },
  assurance: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  assuranceText: { color: colors.onDark, fontFamily: typography.bodySemibold, fontSize: 13 },
  bottom: {
    alignItems: 'center',
    borderTopColor: colors.graphiteLine,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
    marginTop: spacing[6],
    paddingTop: spacing[5],
  },
  bottomLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[5] },
  small: { color: colors.onDarkMuted, fontSize: 12, lineHeight: 18 },
  smallLink: { color: colors.onDarkMuted, fontFamily: typography.body, fontSize: 12, textDecorationLine: 'none' },
});
