import type { ReactNode } from 'react';
import { Link, type Href } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, spacing, typography } from '@/theme/tokens';

import { AppText } from './AppText';

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  linkLabel?: string;
  linkAccessibilityLabel?: string;
  href?: Href;
  tone?: 'light' | 'dark';
  // Extra controls beside the link, such as shelf scroll arrows.
  trailing?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  linkLabel,
  linkAccessibilityLabel,
  href,
  tone = 'light',
  trailing,
}: SectionHeaderProps) {
  const dark = tone === 'dark';
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <View style={styles.eyebrowRow}>
          <View style={styles.rule} />
          <AppText
            style={[
              styles.eyebrow,
              { color: dark ? colors.mint : colors.olive },
            ]}
          >
            {eyebrow}
          </AppText>
        </View>
        <AppText
          accessibilityRole="header"
          tone={dark ? 'inverse' : 'primary'}
          variant="heading"
        >
          {title}
        </AppText>
        {description ? (
          <AppText
            style={{ color: dark ? colors.onDarkMuted : colors.mineral }}
          >
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={styles.actions}>
        {href && linkLabel ? (
          <Link
            accessibilityLabel={linkAccessibilityLabel ?? linkLabel}
            href={href}
            style={styles.link}
          >
            <AppText
              style={[
                styles.linkText,
                { color: dark ? colors.mint : colors.ink },
              ]}
            >
              {linkLabel}
            </AppText>
            <ArrowRight color={dark ? colors.mint : colors.ink} size={16} />
          </Link>
        ) : null}
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    justifyContent: 'space-between',
  },
  copy: { flexShrink: 1, gap: spacing[2], maxWidth: 720 },
  eyebrowRow: { alignItems: 'center', flexDirection: 'row', gap: spacing[2] },
  rule: { backgroundColor: colors.mint, height: 2, width: 22 },
  eyebrow: {
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    lineHeight: 16,
  },
  actions: { alignItems: 'center', flexDirection: 'row', gap: spacing[4] },
  link: {
    alignItems: 'center',
    borderBottomColor: colors.mint,
    borderBottomWidth: 2,
    flexDirection: 'row',
    gap: spacing[2],
    minHeight: 44,
    paddingVertical: spacing[2],
    textDecorationLine: 'none',
  },
  linkText: { fontFamily: typography.bodyBold, fontSize: 14 },
});
