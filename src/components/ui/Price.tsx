import { StyleSheet, View, type ViewProps } from 'react-native';

import { formatInr } from '@/lib/money';
import { colors, spacing, typography } from '@/theme/tokens';

import { AppText } from './AppText';

type PriceProps = ViewProps & {
  amountPaise: number;
  mrpPaise?: number;
  size?: 'compact' | 'regular' | 'large';
};

export function Price({
  amountPaise,
  mrpPaise,
  size = 'regular',
  style,
  ...props
}: PriceProps) {
  const variant =
    size === 'large' ? 'heading' : size === 'compact' ? 'label' : 'title';
  const hasDiscount = mrpPaise !== undefined && mrpPaise > amountPaise;

  return (
    <View {...props} style={[styles.row, style]}>
      <AppText variant={variant}>{formatInr(amountPaise)}</AppText>
      {hasDiscount ? (
        <AppText style={styles.mrp} tone="muted" variant="caption">
          MRP {formatInr(mrpPaise)}
        </AppText>
      ) : null}
      {hasDiscount ? (
        <AppText style={styles.save} variant="caption">
          {Math.round(((mrpPaise - amountPaise) / mrpPaise) * 100)}% off
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  mrp: {
    textDecorationLine: 'line-through',
  },
  save: {
    color: colors.success,
    fontFamily: typography.bodyBold,
  },
});
