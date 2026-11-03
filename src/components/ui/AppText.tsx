import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/theme/tokens';

export type AppTextVariant =
  | 'eyebrow'
  | 'caption'
  | 'label'
  | 'body'
  | 'bodyLarge'
  | 'title'
  | 'heading'
  | 'display'
  | 'hero';

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: AppTextVariant;
    tone?: 'primary' | 'muted' | 'accent' | 'danger' | 'success' | 'inverse';
  }
>;

const toneStyles: Record<NonNullable<AppTextProps['tone']>, TextStyle> = {
  primary: { color: colors.bone },
  muted: { color: colors.mineral },
  accent: { color: colors.goldInk },
  danger: { color: colors.danger },
  success: { color: colors.success },
  inverse: { color: colors.onDark },
};

export function AppText({
  children,
  style,
  tone = 'primary',
  variant = 'body',
  ...props
}: AppTextProps) {
  return (
    <Text {...props} style={[styles[variant], toneStyles[tone], style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: typography.bodyMedium,
    fontSize: typography.sizes.caption,
    lineHeight: typography.lineHeights.caption,
  },
  label: {
    fontFamily: typography.bodyBold,
    fontSize: typography.sizes.label,
    letterSpacing: 0.4,
    lineHeight: typography.lineHeights.label,
  },
  body: {
    fontFamily: typography.body,
    fontSize: typography.sizes.body,
    lineHeight: typography.lineHeights.body,
  },
  bodyLarge: {
    fontFamily: typography.body,
    fontSize: typography.sizes.bodyLarge,
    lineHeight: typography.lineHeights.bodyLarge,
  },
  title: {
    fontFamily: typography.displayMedium,
    fontSize: typography.sizes.title,
    lineHeight: typography.lineHeights.title,
  },
  heading: {
    fontFamily: typography.display,
    fontSize: typography.sizes.heading,
    letterSpacing: -0.4,
    textTransform: 'uppercase',
    lineHeight: typography.lineHeights.heading,
  },
  display: {
    fontFamily: typography.display,
    fontSize: typography.sizes.display,
    letterSpacing: -1,
    textTransform: 'uppercase',
    lineHeight: typography.lineHeights.display,
  },
  hero: {
    fontFamily: typography.displayHeavy,
    fontSize: typography.sizes.hero,
    letterSpacing: -1.5,
    textTransform: 'uppercase',
    lineHeight: typography.lineHeights.hero,
  },
});
