import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export function AdvisorBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.copy}>
        <AppText style={styles.eyebrow} variant="label">
          GUIDED ADVISOR
        </AppText>
        <AppText style={styles.title} variant="heading">
          Your goals are personal. Your supplement shelf should be too.
        </AppText>
        <AppText style={styles.body} variant="bodyLarge">
          Tell us your routine, dietary preferences, stimulant sensitivity, and
          budget. We’ll narrow the catalog without pretending to be your doctor.
        </AppText>
      </View>
      <Link
        accessibilityLabel="Start guided advisor"
        href="/advisor"
        style={styles.link}
      >
        Build my stack →
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'flex-start',
    backgroundColor: colors.violet,
    borderRadius: radii.md,
    gap: spacing[6],
    justifyContent: 'space-between',
    padding: spacing[8],
  },
  copy: {
    gap: spacing[3],
    maxWidth: 760,
  },
  eyebrow: {
    color: colors.obsidian,
    letterSpacing: 1.5,
  },
  title: {
    color: colors.bone,
  },
  body: {
    color: colors.bone,
  },
  link: {
    backgroundColor: colors.bone,
    borderRadius: radii.xs,
    color: colors.obsidian,
    fontFamily: typography.bodyBold,
    minHeight: 44,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
});
