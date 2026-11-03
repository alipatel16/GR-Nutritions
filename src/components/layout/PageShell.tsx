import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { layout, spacing } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

type PageShellProps = PropsWithChildren<ViewProps>;

export function PageShell({ children, style, ...props }: PageShellProps) {
  const breakpoint = useBreakpoint();
  const horizontalPadding = breakpoint === 'mobile' ? spacing[4] : spacing[8];

  return (
    <View
      {...props}
      style={[styles.outer, { paddingHorizontal: horizontalPadding }, style]}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    width: '100%',
  },
  inner: {
    maxWidth: layout.pageMaxWidth,
    width: '100%',
  },
});
