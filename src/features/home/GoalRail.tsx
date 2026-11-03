import { Link, type Href } from 'expo-router';
import { Activity, Dumbbell, HeartPulse, Leaf, Scale, Zap } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const goals = [
  { label: 'Build muscle', detail: 'Protein and strength essentials', goal: 'muscle-gain', Icon: Dumbbell },
  { label: 'Train harder', detail: 'Energy and endurance support', goal: 'energy', Icon: Zap },
  { label: 'Recover better', detail: 'Post-workout daily routines', goal: 'recovery', Icon: Activity },
  { label: 'Everyday wellness', detail: 'Build a consistent foundation', goal: 'everyday-wellness', Icon: Leaf },
  { label: 'Support immunity', detail: 'Daily nutrition essentials', goal: 'immunity', Icon: HeartPulse },
  { label: 'Stay on track', detail: 'Goal-aware nutrition choices', goal: 'weight-management', Icon: Scale },
] as const;

export function GoalRail() {
  return (
    <View style={styles.section}>
      <SectionHeader
        description="Six clear paths into the shelf, built around what you are training for."
        eyebrow="YOUR ROUTINE. YOUR RULES."
        title="SHOP BY GOAL"
        tone="dark"
      />
      <ScrollView contentContainerStyle={styles.rail} horizontal showsHorizontalScrollIndicator={false}>
        {goals.map(({ label, detail, goal, Icon }, index) => (
          <Link
            accessibilityLabel={`Shop ${goal.replaceAll('-', ' ')}`}
            asChild
            href={`/shop?goal=${goal}` as Href}
            key={goal}
          >
            <Pressable style={styles.card}>
              <View style={styles.topRow}>
                <View style={styles.icon}><Icon color={colors.gold} size={24} /></View>
                <AppText style={styles.index}>0{index + 1}</AppText>
              </View>
              <AppText style={styles.title}>{label}</AppText>
              <AppText style={styles.detail}>{detail}</AppText>
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.midnight,
    borderRadius: radii.lg,
    gap: spacing[6],
    overflow: 'hidden',
    padding: spacing[8],
  },
  rail: { gap: spacing[3], paddingBottom: spacing[1] },
  card: {
    backgroundColor: colors.midnightRaised,
    borderColor: colors.midnightLine,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 184,
    padding: spacing[5],
    width: 216,
  },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  icon: {
    alignItems: 'center',
    backgroundColor: '#1B2540',
    borderRadius: radii.sm,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  index: { color: colors.gold, fontFamily: typography.displayHeavy, fontSize: 26 },
  title: {
    color: colors.onDark,
    fontFamily: typography.display,
    fontSize: 24,
    lineHeight: 28,
    marginTop: spacing[6],
    textTransform: 'uppercase',
  },
  detail: { color: colors.onDarkMuted, fontSize: 13, lineHeight: 19, marginTop: spacing[1] },
});
