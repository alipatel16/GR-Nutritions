import { Link, type Href } from 'expo-router';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Price } from '@/components/ui/Price';
import { formatInr } from '@/lib/money';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import type { CartLine as CartLineType } from './types';

type CartLineProps = {
  line: CartLineType;
  onUpdateQuantity(quantity: number): void;
  onRemove(): void;
};

export function CartLine({ line, onUpdateQuantity, onRemove }: CartLineProps) {
  const atStockLimit = line.quantity >= line.stockAvailable;
  return (
    <View style={styles.line}>
      <View style={styles.media}>
        <AppText style={styles.mediaText}>
          {line.productName
            .split(' ')
            .slice(0, 2)
            .map((word) => word.charAt(0))
            .join('')}
        </AppText>
      </View>
      <View style={styles.details}>
        <View style={styles.topRow}>
          <View style={styles.copy}>
            <Link
              href={`/product/${line.productSlug}` as Href}
              numberOfLines={2}
              style={styles.productLink}
            >
              {line.productName}
            </Link>
            <AppText tone="muted" variant="caption">
              {line.variantLabel}
            </AppText>
            <AppText tone="muted" variant="caption">
              {formatInr(line.unitPricePaise)} each
            </AppText>
          </View>
          <Pressable
            accessibilityLabel={`Remove ${line.productName}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onRemove}
            style={styles.remove}
          >
            <Trash2 color={colors.mineral} size={17} />
          </Pressable>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.stepper}>
            <Pressable
              accessibilityLabel={`Decrease ${line.productName} quantity`}
              accessibilityRole="button"
              onPress={() => onUpdateQuantity(line.quantity - 1)}
              style={styles.quantityButton}
            >
              <Minus color={colors.ink} size={16} />
            </Pressable>
            <AppText accessibilityLabel={`Quantity ${line.quantity}`} style={styles.quantity}>
              {line.quantity}
            </AppText>
            <Pressable
              accessibilityLabel={`Increase ${line.productName} quantity`}
              accessibilityRole="button"
              disabled={atStockLimit}
              onPress={() => onUpdateQuantity(line.quantity + 1)}
              style={[styles.quantityButton, atStockLimit && styles.disabled]}
            >
              <Plus color={colors.ink} size={16} />
            </Pressable>
          </View>
          <Price
            amountPaise={line.unitPricePaise * line.quantity}
            size="regular"
            style={styles.lineTotal}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
    padding: spacing[3],
  },
  media: {
    alignItems: 'center',
    backgroundColor: colors.graphite,
    borderRadius: radii.sm,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  mediaText: { color: colors.mint, fontFamily: typography.bodyBold, fontSize: 20 },
  details: { flex: 1, gap: spacing[3], minWidth: 0 },
  topRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[2] },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  productLink: {
    color: colors.bone,
    fontFamily: typography.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    textDecorationLine: 'none',
  },
  remove: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  bottomRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepper: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
  },
  quantityButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 38,
  },
  disabled: { opacity: 0.35 },
  quantity: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 15, minWidth: 24, textAlign: 'center' },
  lineTotal: { justifyContent: 'flex-end' },
});
