import { Link, type Href } from 'expo-router';
import { Activity, Apple, Dumbbell, HeartPulse, Leaf, Zap } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const categories = [
  { label: 'Protein', note: 'Whey, isolate & plant', href: '/shop?category=protein', Icon: Dumbbell },
  { label: 'Recovery', note: 'Creatine & post-workout', href: '/shop?category=post-workout', Icon: Activity },
  { label: 'Pre-workout', note: 'Energy for training', href: '/shop?category=pre-workout', Icon: Zap },
  { label: 'Wellness', note: 'Daily foundations', href: '/shop?category=wellness', Icon: HeartPulse },
  { label: 'Vitamins', note: 'Everyday support', href: '/shop?category=vitamins', Icon: Leaf },
  { label: 'Healthy snacks', note: 'Nutrition on the go', href: '/shop?category=healthy-snacks', Icon: Apple },
] as const;

export function CategoryRail() {
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View>
          <AppText style={styles.kicker}>SHOP YOUR WAY</AppText>
          <AppText variant="heading">START WITH A CATEGORY</AppText>
        </View>
        <Link href="/shop" style={styles.viewAll}>See the full catalogue →</Link>
      </View>
      <ScrollView
        contentContainerStyle={styles.rail}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categories.map(({ label, note, href, Icon }) => (
          <Link
            accessibilityLabel={`Shop ${label.toLowerCase().replaceAll('-', ' ')}`}
            asChild
            href={href as Href}
            key={label}
          >
            <Pressable style={styles.card}>
              <View style={styles.icon}><Icon color={colors.violet} size={24} /></View>
              <AppText style={styles.title}>{label}</AppText>
              <AppText style={styles.note}>{note}</AppText>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[5] },
  headingRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  kicker: {
    color: colors.mineral,
    fontFamily: typography.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
    lineHeight: 17,
    marginBottom: spacing[1],
  },
  viewAll: {
    color: colors.violet,
    fontFamily: typography.bodyBold,
    minHeight: 44,
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  rail: { gap: spacing[3], paddingBottom: spacing[1] },
  card: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 150,
    padding: spacing[5],
    width: 190,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: '#E8EFE8',
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    marginBottom: spacing[5],
    width: 44,
  },
  title: { fontFamily: typography.bodyBold, fontSize: 16, lineHeight: 22 },
  note: { color: colors.mineral, fontSize: 11, lineHeight: 17, marginTop: spacing[1] },
});
