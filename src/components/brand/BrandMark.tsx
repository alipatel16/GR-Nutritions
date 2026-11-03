import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, typography } from '@/theme/tokens';

type BrandMarkProps = {
  tone?: 'dark' | 'light';
  compact?: boolean;
};

// "gr/nutritions" wordmark used in the header, footer and coach.
export function BrandMark({ tone = 'dark', compact = false }: BrandMarkProps) {
  const onDark = tone === 'dark';
  const base = onDark ? colors.onDark : colors.ink;
  return (
    <View style={styles.stack}>
      <AppText style={[styles.word, compact && styles.compact, { color: base }]}>
        gr<AppText style={[styles.word, compact && styles.compact, { color: onDark ? colors.mint : colors.mintInk }]}>/</AppText>
        nutritions
      </AppText>
      {compact ? null : (
        <AppText style={[styles.tagline, { color: onDark ? colors.graphiteMuted : colors.slate }]}>
          AUTHENTIC SUPPLEMENTS
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 1 },
  word: { fontFamily: typography.bodyBold, fontSize: 21, letterSpacing: -0.4, lineHeight: 26 },
  compact: { fontSize: 17, lineHeight: 22 },
  tagline: { fontFamily: typography.bodySemibold, fontSize: 8.5, letterSpacing: 2, lineHeight: 12 },
});
