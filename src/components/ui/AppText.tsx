import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/theme/tokens';

export type AppTextVariant =
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
    tone?: 'primary' | 'muted' | 'accent' | 'danger';
  }
>;

const toneStyles: Record<NonNullable<AppTextProps['tone']>, TextStyle> = {
  primary: { color: colors.bone },
  muted: { color: colors.mineral },
  accent: { color: colors.lime },
  danger: { color: colors.danger },
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
    letterSpacing: -0.8,
    lineHeight: typography.lineHeights.heading,
  },
  display: {
    fontFamily: typography.display,
    fontSize: typography.sizes.display,
    letterSpacing: -2,
    lineHeight: typography.lineHeights.display,
  },
  hero: {
    fontFamily: typography.displayHeavy,
    fontSize: typography.sizes.hero,
    letterSpacing: -3,
    lineHeight: typography.lineHeights.hero,
  },
});
