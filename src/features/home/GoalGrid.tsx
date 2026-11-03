import { Link, type Href } from 'expo-router';
import {
  Activity,
  Dumbbell,
  Flame,
  HeartPulse,
  Leaf,
  MessageCircle,
  Zap,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

const goals = [
  { label: 'Build muscle', detail: 'Protein and strength essentials', goal: 'muscle-gain', Icon: Dumbbell },
  { label: 'Lose fat', detail: 'Lean, goal-aware picks', goal: 'weight-management', Icon: Flame },
  { label: 'More energy', detail: 'Pre-workout and training fuel', goal: 'energy', Icon: Zap },
  { label: 'Recover faster', detail: 'Post-workout support', goal: 'recovery', Icon: Activity },
  { label: 'Daily health', detail: 'Everyday foundations', goal: 'everyday-wellness', Icon: Leaf },
  { label: 'Immunity', detail: 'Daily nutrition essentials', goal: 'immunity', Icon: HeartPulse },
] as const;

// Dark band under the hero: the HK2 "What's your goal?" entry point.
export function GoalGrid() {
  const breakpoint = useBreakpoint();
  const columns = breakpoint === 'desktop' ? 4 : breakpoint === 'tablet' ? 4 : 2;
  const basis = `${100 / columns}%` as `${number}%`;
  const mobile = breakpoint === 'mobile';

  return (
    <View style={styles.band}>
      <PageShell>
        <View style={styles.heading}>
          <AppText accessibilityRole="header" style={styles.title}>
            What’s your goal?
          </AppText>
          <AppText style={styles.subtitle}>
            Pick one and we’ll show the right shelf, or ask GR Coach.
          </AppText>
        </View>
        <View style={styles.grid}>
          {goals.map(({ label, detail, goal, Icon }, index) => (
            <View key={goal} style={[styles.cell, { width: basis }]}>
              <Link accessibilityLabel={`Shop ${goal.replaceAll('-', ' ')}`} asChild href={`/shop?goal=${goal}` as Href}>
                <Pressable style={StyleSheet.flatten([styles.tile, mobile && styles.mobileTile, index === 0 && styles.featured])}>
                  <Icon color={index === 0 ? colors.onMint : colors.mint} size={24} />
                  <View>
                    <AppText style={[styles.label, index === 0 && styles.featuredText]}>{label}</AppText>
                    {mobile ? null : (
                      <AppText style={[styles.detail, index === 0 && styles.featuredDetail]}>{detail}</AppText>
                    )}
                  </View>
                </Pressable>
              </Link>
            </View>
          ))}
          <View style={[styles.cell, { width: basis }]}>
            <Link accessibilityLabel="Ask GR Coach which goal fits" asChild href="/advisor">
              <Pressable style={StyleSheet.flatten([styles.tile, mobile && styles.mobileTile, styles.coach])}>
                <MessageCircle color={colors.mint} size={24} />
                <View>
                  <AppText style={[styles.label, styles.coachText]}>{mobile ? 'Ask Coach' : 'Not sure? Ask Coach'}</AppText>
                  {mobile ? null : <AppText style={styles.detail}>AI answers in seconds</AppText>}
                </View>
              </Pressable>
            </Link>
          </View>
        </View>
      </PageShell>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: colors.graphite, paddingBottom: spacing[10], paddingTop: spacing[8] },
  heading: { gap: spacing[1], marginBottom: spacing[5] },
  title: { color: colors.onDark, fontFamily: typography.bodyBold, fontSize: 30, letterSpacing: -0.6, lineHeight: 36 },
  subtitle: { color: colors.graphiteMuted, fontSize: 15, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', margin: -6 },
  cell: { padding: 6 },
  tile: {
    backgroundColor: colors.graphiteRaised,
    borderColor: colors.graphiteLine,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing[5],
    justifyContent: 'space-between',
    minHeight: 132,
    padding: spacing[5],
  },
  mobileTile: { gap: spacing[3], minHeight: 0, padding: spacing[4] },
  featured: { backgroundColor: colors.mint, borderColor: colors.mint },
  label: { color: colors.onDark, fontFamily: typography.bodyBold, fontSize: 16, lineHeight: 22 },
  detail: { color: colors.graphiteMuted, fontSize: 12.5, lineHeight: 18 },
  featuredText: { color: colors.onMint },
  featuredDetail: { color: '#1F5A49' },
  coach: { backgroundColor: '#1A2420', borderColor: colors.mint, borderStyle: 'dashed' },
  coachText: { color: colors.mint },
});
