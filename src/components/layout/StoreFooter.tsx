import { Link, type Href } from 'expo-router';
import { ArrowUpRight, MessageCircle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

import { PageShell } from './PageShell';
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
] as const;

export function StoreFooter() {
  return (
    <View style={styles.footer}>
      <PageShell>
        <View style={styles.top}>
          <View style={styles.brandBlock}>
            <View style={styles.logoRow}>
              <View style={styles.mark}><AppText style={styles.markText}>GR</AppText></View>
              <View>
                <AppText style={styles.brand}>GR NUTRITIONS</AppText>
                <AppText style={styles.tagline}>FUEL YOUR EVERYDAY</AppText>
              </View>
            </View>
            <AppText style={styles.brandCopy}>
              A clearer way to explore performance, recovery, and everyday nutrition.
            </AppText>
            <Link accessibilityLabel="Open GR Coach from footer" href="/advisor" style={styles.coachLink}>
              <MessageCircle color="#FFF" size={16} />
              <AppText style={styles.coachText}>Ask GR Coach</AppText>
            </Link>
          </View>

          <View style={styles.columns}>
            {columns.map((column) => (
              <View key={column.title} style={styles.column}>
                <AppText style={styles.columnTitle}>{column.title}</AppText>
                {column.links.map(([label, href, accessibilityLabel]) => (
                  <Link
                    accessibilityLabel={accessibilityLabel}
                    href={href as Href}
                    key={label}
                    style={styles.link}
                  >
                    {label}  ↗
                  </Link>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottom}>
          <AppText style={styles.small}>© {new Date().getFullYear()} GR Nutritions</AppText>
          <View style={styles.bottomLinks}>
            <Link href="/shop" style={styles.smallLink}>Catalogue</Link>
            <Link href="/account" style={styles.smallLink}>Customer account</Link>
            <Link href="/admin" style={styles.smallLink}>Store administration</Link>
          </View>
          <ArrowUpRight color="#8FA093" size={16} />
        </View>
      </PageShell>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { backgroundColor: '#153526', marginTop: 72, paddingVertical: 48 },
  top: { flexDirection: 'row', flexWrap: 'wrap', gap: 56, justifyContent: 'space-between' },
  brandBlock: { gap: spacing[5], maxWidth: 340, minWidth: 250 },
  logoRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[3] },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.lime,
    height: 48,
    justifyContent: 'center',
    transform: [{ skewX: '-6deg' }],
    width: 44,
  },
  markText: { color: '#FFF', fontFamily: typography.displayHeavy, fontSize: 31, lineHeight: 35 },
  brand: { color: '#FFF', fontFamily: typography.bodyBold, fontSize: 18, letterSpacing: 0.8 },
  tagline: { color: '#AFC0B2', fontSize: 8, letterSpacing: 2.2, lineHeight: 15 },
  brandCopy: { color: '#C7D4C9', fontSize: 13, lineHeight: 22 },
  coachLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.lime,
    borderRadius: 6,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 44,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  coachText: { color: '#FFF', fontFamily: typography.bodyBold, fontSize: 12 },
  columns: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 44, justifyContent: 'flex-end', minWidth: 280 },
  column: { gap: spacing[3], minWidth: 130 },
  columnTitle: { color: '#FFF', fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 1.4 },
  link: { color: '#C7D4C9', fontFamily: typography.body, fontSize: 12, lineHeight: 20, textDecorationLine: 'none' },
  bottom: {
    alignItems: 'center',
    borderTopColor: '#355445',
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
    marginTop: 44,
    paddingTop: spacing[5],
  },
  bottomLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[5] },
  small: { color: '#8FA093', fontSize: 10, lineHeight: 16 },
  smallLink: { color: '#AFC0B2', fontFamily: typography.body, fontSize: 10, textDecorationLine: 'none' },
});
