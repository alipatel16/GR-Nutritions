import { Link } from 'expo-router';
import { SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

const sampleQuestions = [
  'Goal · Muscle gain',
  'Budget · Up to ₹1,500 per product',
  'Diet · Vegetarian',
];

export function AdvisorBanner() {
  const mobile = useBreakpoint() === 'mobile';
  return (
    <View style={[styles.banner, mobile && styles.mobileBanner]}>
      <View style={styles.copy}>
        <View style={styles.eyebrowRow}>
          <Sparkles color={colors.mint} size={15} />
          <AppText style={styles.eyebrow}>GR COACH</AppText>
        </View>
        <AppText style={styles.title} variant="heading">
          Find products that fit your preferences.
        </AppText>
        <AppText style={styles.body} variant="bodyLarge">
          Choose your goal, diet, budget and stimulant preference to see matching
          in-stock products from our catalogue.
        </AppText>
        <Link accessibilityLabel="Start guided advisor" href="/advisor" style={styles.link}>
          <SlidersHorizontal color={colors.graphite} size={18} />
          <AppText style={styles.linkText}>Find my matches</AppText>
        </Link>
      </View>
      <View style={[styles.preview, mobile && styles.mobilePreview]}>
        {sampleQuestions.map((question) => (
          <View key={question} style={styles.question}>
            <AppText style={styles.questionText}>{question}</AppText>
          </View>
        ))}
        <View style={styles.answer}>
          <View style={styles.answerAvatar}>
            <SlidersHorizontal color={colors.graphite} size={16} />
          </View>
          <AppText style={styles.answerText}>
            See up to three matches and why each fits.
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.graphite,
    borderColor: colors.graphiteLine,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    overflow: 'hidden',
    padding: spacing[10],
  },
  mobileBanner: { flexDirection: 'column', gap: spacing[6], padding: spacing[6] },
  copy: { flex: 1, gap: spacing[4], minWidth: 0 },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  eyebrow: { color: colors.mint, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 2 },
  title: { color: colors.onDark },
  body: { color: colors.onDarkMuted },
  link: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.mint,
    borderRadius: radii.xs,
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
    minHeight: 50,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  linkText: { color: colors.graphite, fontFamily: typography.bodyBold, fontSize: 14 },
  preview: { flex: 1, gap: spacing[3], justifyContent: 'center', minWidth: 0 },
  mobilePreview: { display: 'none' },
  question: {
    alignSelf: 'flex-end',
    backgroundColor: colors.mint,
    borderBottomRightRadius: 4,
    borderRadius: radii.md,
    maxWidth: '85%',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  questionText: { color: colors.graphite, fontFamily: typography.bodySemibold, fontSize: 13.5 },
  answer: {
    alignItems: 'flex-start',
    backgroundColor: colors.graphiteRaised,
    borderColor: colors.graphiteLine,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    maxWidth: '90%',
    padding: spacing[4],
  },
  answerAvatar: {
    alignItems: 'center',
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  answerText: { color: colors.onDark, flex: 1, fontSize: 13.5, lineHeight: 20 },
});
