import { Link, type Href } from 'expo-router';
import { Activity, Apple, Dumbbell, HeartPulse, Leaf, Zap } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radii, shadows, spacing, typography } from '@/theme/tokens';

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
      <SectionHeader
        eyebrow="SHOP YOUR WAY"
        href="/shop"
        linkLabel="See the full catalogue"
        title="START WITH A CATEGORY"
      />
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
              <View style={styles.icon}><Icon color={colors.gold} size={24} /></View>
              <View>
                <AppText style={styles.title}>{label}</AppText>
                <AppText style={styles.note}>{note}</AppText>
              </View>
              <AppText style={styles.shop}>Shop now →</AppText>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing[6] },
  rail: { gap: spacing[4], paddingBottom: spacing[2] },
  card: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[4],
    minHeight: 196,
    padding: spacing[5],
    width: 200,
    ...shadows.card,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.midnight,
    borderRadius: radii.sm,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  title: { fontFamily: typography.display, fontSize: 24, letterSpacing: 0.3, lineHeight: 28, textTransform: 'uppercase' },
  note: { color: colors.mineral, fontSize: 13, lineHeight: 19, marginTop: spacing[1] },
  shop: { color: colors.goldInk, fontFamily: typography.bodyBold, fontSize: 12.5, marginTop: 'auto' },
});
