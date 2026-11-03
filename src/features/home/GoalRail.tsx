import { Link, type Href } from 'expo-router';
import { Activity, Dumbbell, HeartPulse, Leaf, Scale, Zap } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
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
      <View style={styles.headingRow}>
        <View>
          <AppText style={styles.kicker}>YOUR ROUTINE. YOUR RULES.</AppText>
          <AppText variant="heading">SHOP BY GOAL</AppText>
        </View>
        <AppText style={styles.helper}>Six clear paths into the shelf</AppText>
      </View>
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
                <View style={styles.icon}><Icon color={colors.violet} size={25} /></View>
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
  helper: { color: colors.mineral, fontSize: 12, lineHeight: 18 },
  rail: { gap: spacing[3], paddingBottom: spacing[1] },
  card: {
    backgroundColor: '#F0F3EB',
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 176,
    padding: spacing[5],
    width: 216,
  },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  icon: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: radii.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  index: { color: '#9AA398', fontFamily: typography.display, fontSize: 20 },
  title: { fontFamily: typography.bodyBold, fontSize: 16, lineHeight: 22, marginTop: spacing[6] },
  detail: { color: colors.mineral, fontSize: 11, lineHeight: 17, marginTop: spacing[1] },
});
