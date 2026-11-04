import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChromeScrollView } from '@/components/navigation/ScrollChrome';
import { AppText } from '@/components/ui/AppText';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

import { PageHero } from './PageHero';
import { PageShell } from './PageShell';
import { StoreFooter } from './StoreFooter';

export type InfoSection = {
  title: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
};

type InfoPageProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  sections?: readonly InfoSection[];
  updated?: string;
  aside?: ReactNode;
}>;

// Shared layout for About, Contact, Help and the legal pages.
export function InfoPage({ eyebrow, title, description, sections = [], updated, aside, children }: InfoPageProps) {
  const desktop = useBreakpoint() === 'desktop';
  return (
    <ChromeScrollView style={styles.page}>
      <PageHero description={description} eyebrow={eyebrow} title={title} />
      <PageShell style={styles.shell}>
        <View style={[styles.layout, !desktop && styles.stacked]}>
          <View style={[styles.main, !desktop && styles.full]}>
            {children}
            {sections.length ? (
              <View style={styles.document}>
                {updated ? (
                  <AppText style={styles.updated} variant="caption">
                    Last updated: {updated}
                  </AppText>
                ) : null}
                {sections.map((section, index) => (
                  <View key={section.title} style={styles.section}>
                    <AppText style={styles.sectionTitle}>
                      {index + 1}. {section.title}
                    </AppText>
                    {section.paragraphs?.map((paragraph) => (
                      <AppText key={paragraph} style={styles.paragraph}>
                        {paragraph}
                      </AppText>
                    ))}
                    {section.bullets?.map((bullet) => (
                      <View key={bullet} style={styles.bulletRow}>
                        <View style={styles.bullet} />
                        <AppText style={styles.bulletText}>{bullet}</AppText>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
          {aside ? <View style={[styles.aside, !desktop && styles.full]}>{aside}</View> : null}
        </View>
      </PageShell>
      <StoreFooter />
    </ChromeScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: colors.obsidian, flex: 1 },
  shell: { paddingTop: spacing[8] },
  layout: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[6] },
  stacked: { flexDirection: 'column' },
  main: { flex: 2, gap: spacing[6], minWidth: 0 },
  aside: { flex: 1, gap: spacing[4], minWidth: 0 },
  full: { flexBasis: 'auto', flexGrow: 0, flexShrink: 0, width: '100%' },
  document: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing[6],
    padding: spacing[6],
  },
  updated: { color: colors.mineral },
  section: { gap: spacing[2] },
  sectionTitle: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 18, lineHeight: 25 },
  paragraph: { color: colors.inkMuted, fontSize: 15, lineHeight: 24 },
  bulletRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[3] },
  bullet: { backgroundColor: colors.mintInk, borderRadius: 3, height: 6, marginTop: 9, width: 6 },
  bulletText: { color: colors.inkMuted, flex: 1, fontSize: 15, lineHeight: 24 },
});
