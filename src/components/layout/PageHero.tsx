import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

import { PageShell } from './PageShell';

type PageHeroProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description?: string;
}>;

// Midnight banner that opens every secondary page (cart, checkout, account…).
export function PageHero({ eyebrow, title, description, children }: PageHeroProps) {
  const mobile = useBreakpoint() === 'mobile';
  return (
    <View style={[styles.hero, mobile && styles.mobileHero]}>
      <PageShell>
        <View style={styles.copy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.rule} />
            <AppText style={styles.eyebrow}>{eyebrow}</AppText>
          </View>
          <AppText
            accessibilityRole="header"
            style={mobile ? styles.mobileTitle : undefined}
            tone="inverse"
            variant="display"
          >
            {title}
          </AppText>
          {description ? <AppText style={styles.description}>{description}</AppText> : null}
          {children}
        </View>
      </PageShell>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.midnight,
    borderBottomColor: colors.gold,
    borderBottomWidth: 3,
    paddingVertical: spacing[12],
  },
  mobileHero: { paddingVertical: spacing[8] },
  copy: { gap: spacing[3], maxWidth: 760 },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  rule: { backgroundColor: colors.gold, height: 2, width: 22 },
  eyebrow: { color: colors.gold, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 2 },
  mobileTitle: { fontSize: 44, lineHeight: 46 },
  description: { color: colors.onDarkMuted, fontSize: 16, lineHeight: 25 },
});
