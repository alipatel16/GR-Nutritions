import { Link, type Href } from 'expo-router';
import { Activity, Apple, Dumbbell, HeartPulse, Leaf, Zap } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

const categories = [
  { label: 'Protein', note: 'Whey, isolate & plant', href: '/shop?category=protein', Icon: Dumbbell },
  { label: 'Recovery', note: 'Creatine & post-workout', href: '/shop?category=post-workout', Icon: Activity },
  { label: 'Pre-workout', note: 'Energy for training', href: '/shop?category=pre-workout', Icon: Zap },
  { label: 'Wellness', note: 'Daily foundations', href: '/shop?category=wellness', Icon: HeartPulse },
  { label: 'Vitamins', note: 'Everyday support', href: '/shop?category=vitamins', Icon: Leaf },
  { label: 'Healthy snacks', note: 'Nutrition on the go', href: '/shop?category=healthy-snacks', Icon: Apple },
] as const;

export function CategoryRail() {
  const breakpoint = useBreakpoint();
  const columns = breakpoint === 'desktop' ? 6 : 3;
  const basis = `${100 / columns}%` as `${number}%`;
  return (
    <View style={styles.section}>
      <SectionHeader
        eyebrow="SHOP YOUR WAY"
        href="/shop"
        linkLabel="See the full catalogue"
        title="Shop by category"
      />
      <View style={styles.grid}>
        {categories.map(({ label, note, href, Icon }) => (
          <View key={label} style={[styles.cell, { width: basis }]}>
            <Link
              accessibilityLabel={`Shop ${label.toLowerCase().replaceAll('-', ' ')}`}
              asChild
              href={href as Href}
            >
              <Pressable style={styles.card}>
                <View style={styles.icon}>
                  <Icon color={colors.mint} size={26} />
                </View>
                <AppText style={styles.title}>{label}</AppText>
                {breakpoint === 'mobile' ? null : <AppText style={styles.note}>{note}</AppText>}
              </Pressable>
            </Link>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[6] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -6 },
  cell: { padding: 6 },
  card: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[5],
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.graphite,
    borderRadius: radii.pill,
    height: 60,
    justifyContent: 'center',
    marginBottom: spacing[1],
    width: 60,
  },
  title: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 15, lineHeight: 20, textAlign: 'center' },
  note: { color: colors.mineral, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
