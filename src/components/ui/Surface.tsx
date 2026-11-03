import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, shadows } from '@/theme/tokens';

type SurfaceProps = PropsWithChildren<
  ViewProps & {
    tone?: 'raised' | 'graphite' | 'outlined' | 'midnight';
  }
>;

export function Surface({
  children,
  style,
  tone = 'raised',
  ...props
}: SurfaceProps) {
  return (
    <View {...props} style={[styles.base, styles[tone], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
  },
  raised: {
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderWidth: 1,
    ...shadows.card,
  },
  midnight: {
    backgroundColor: colors.midnight,
  },
  graphite: {
    backgroundColor: colors.graphite,
  },
  outlined: {
    backgroundColor: colors.transparent,
    borderColor: colors.line,
    borderWidth: 1,
  },
});
