import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, typography } from '@/theme/tokens';

type BrandMarkProps = {
  tone?: 'dark' | 'light';
  compact?: boolean;
};

// Shield monogram + wordmark used in the header, footer and coach.
export function BrandMark({ tone = 'dark', compact = false }: BrandMarkProps) {
  const onDark = tone === 'dark';
  return (
    <View style={styles.row}>
      <View style={[styles.mark, compact && styles.markCompact]}>
        <AppText style={[styles.markText, compact && styles.markTextCompact]}>GR</AppText>
      </View>
      {compact ? null : (
        <View>
          <AppText style={[styles.brand, { color: onDark ? colors.onDark : colors.ink }]}>
            GR NUTRITIONS
          </AppText>
          <AppText style={[styles.tagline, { color: onDark ? colors.gold : colors.goldInk }]}>
            100% AUTHENTIC SUPPLEMENTS
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    height: 44,
    justifyContent: 'center',
    width: 40,
  },
  markCompact: { height: 34, width: 31, borderBottomLeftRadius: 11, borderBottomRightRadius: 11 },
  markText: {
    color: colors.midnight,
    fontFamily: typography.displayHeavy,
    fontSize: 24,
    letterSpacing: 0.5,
    lineHeight: 28,
  },
  markTextCompact: { fontSize: 18, lineHeight: 22 },
  brand: { fontFamily: typography.displayHeavy, fontSize: 22, letterSpacing: 1.2, lineHeight: 24 },
  tagline: { fontFamily: typography.bodyBold, fontSize: 8.5, letterSpacing: 1.8, lineHeight: 13 },
});
