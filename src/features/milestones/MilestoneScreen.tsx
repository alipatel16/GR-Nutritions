import { Link, type Href } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PageShell } from '@/components/layout/PageShell';
import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

type MilestoneScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  steps: readonly { number: string; label: string }[];
  linkLabel: string;
  linkHref: Href;
};

export function MilestoneScreen({
  eyebrow,
  title,
  description,
  note,
  steps,
  linkLabel,
  linkHref,
}: MilestoneScreenProps) {
  const breakpoint = useBreakpoint();

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.page}
    >
      <PageShell style={styles.shell}>
        <View style={styles.hero}>
          <View
            style={[
              styles.copy,
              breakpoint === 'mobile' && styles.mobileColumn,
            ]}
          >
            <AppText style={styles.eyebrow} tone="accent" variant="label">
              {eyebrow}
            </AppText>
            <AppText accessibilityRole="header" variant="display">
              {title}
            </AppText>
            <AppText
              style={styles.description}
              tone="muted"
              variant="bodyLarge"
            >
              {description}
            </AppText>
            <Link
              accessibilityLabel={linkLabel}
              href={linkHref}
              style={styles.link}
            >
              {linkLabel} →
            </Link>
          </View>

          <View
            accessibilityLabel={`${eyebrow} preview`}
            style={[
              styles.preview,
              breakpoint === 'mobile' && styles.mobileColumn,
            ]}
          >
            <View style={styles.previewTop}>
              <AppText tone="accent" variant="caption">
                PRODUCT ROADMAP
              </AppText>
              <View style={styles.statusDot} />
            </View>
            {steps.map((step) => (
              <View key={step.number} style={styles.step}>
                <AppText tone="accent" variant="caption">
                  {step.number}
                </AppText>
                <AppText variant="label">{step.label}</AppText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.note}>
          <AppText tone="accent" variant="caption">
            HONEST PREVIEW
          </AppText>
          <AppText tone="muted">{note}</AppText>
        </View>
      </PageShell>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.obsidian,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  shell: {
    gap: spacing[10],
    paddingBottom: spacing[24],
    paddingTop: spacing[10],
  },
  hero: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[10],
    minHeight: 520,
  },
  copy: {
    flex: 1.2,
    gap: spacing[5],
    justifyContent: 'center',
    minWidth: 0,
  },
  eyebrow: {
    letterSpacing: 2.5,
  },
  description: {
    maxWidth: 680,
  },
  link: {
    alignSelf: 'flex-start',
    backgroundColor: colors.lime,
    borderRadius: radii.xs,
    color: colors.obsidian,
    fontFamily: typography.bodyBold,
    minHeight: 44,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
  preview: {
    alignSelf: 'center',
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.violet,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 0.8,
    gap: spacing[3],
    minWidth: 0,
    padding: spacing[5],
  },
  mobileColumn: {
    flexBasis: '100%',
    width: '100%',
  },
  previewTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  statusDot: {
    backgroundColor: colors.violet,
    borderRadius: radii.pill,
    height: 10,
    width: 10,
  },
  step: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[4],
    minHeight: 64,
    paddingHorizontal: spacing[4],
  },
  note: {
    borderLeftColor: colors.lime,
    borderLeftWidth: 2,
    gap: spacing[2],
    maxWidth: 780,
    paddingLeft: spacing[4],
  },
});
