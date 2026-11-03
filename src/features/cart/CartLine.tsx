import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Price } from '@/components/ui/Price';
import { colors, layout, radii, spacing, typography } from '@/theme/tokens';

import type { CartLine as CartLineType } from './types';

type CartLineProps = {
  line: CartLineType;
  onUpdateQuantity(quantity: number): void;
  onRemove(): void;
};

export function CartLine({ line, onUpdateQuantity, onRemove }: CartLineProps) {
  return (
    <View style={styles.line}>
      <View style={[styles.media, { backgroundColor: line.imageColor }]}>
        <AppText style={styles.mediaText} variant="title">
          {line.productName
            .split(' ')
            .slice(0, 2)
            .map((word) => word.charAt(0))
            .join('')}
        </AppText>
      </View>
      <View style={styles.details}>
        <Link
          href={`/product/${line.productSlug}` as Href}
          style={styles.productLink}
        >
          {line.productName}
        </Link>
        <AppText tone="muted" variant="caption">
          {line.variantLabel}
        </AppText>
        <Price amountPaise={line.unitPricePaise} size="compact" />
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={`Decrease ${line.productName} quantity`}
            accessibilityRole="button"
            onPress={() => onUpdateQuantity(line.quantity - 1)}
            style={styles.quantityButton}
          >
            <AppText variant="label">−</AppText>
          </Pressable>
          <AppText
            accessibilityLabel={`Quantity ${line.quantity}`}
            variant="label"
          >
            Quantity {line.quantity}
          </AppText>
          <Pressable
            accessibilityLabel={`Increase ${line.productName} quantity`}
            accessibilityRole="button"
            disabled={line.quantity >= line.stockAvailable}
            onPress={() => onUpdateQuantity(line.quantity + 1)}
            style={styles.quantityButton}
          >
            <AppText variant="label">+</AppText>
          </Pressable>
          <Pressable
            accessibilityLabel={`Remove ${line.productName}`}
            accessibilityRole="button"
            onPress={onRemove}
            style={styles.remove}
          >
            <AppText tone="muted" variant="caption">
              Remove
            </AppText>
          </Pressable>
        </View>
      </View>
      <Price
        amountPaise={line.unitPricePaise * line.quantity}
        size="regular"
        style={styles.lineTotal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[5],
    paddingVertical: spacing[6],
  },
  media: {
    alignItems: 'center',
    borderRadius: radii.sm,
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  mediaText: {
    color: colors.obsidian,
  },
  details: {
    flex: 1,
    gap: spacing[2],
    minWidth: 230,
  },
  productLink: {
    color: colors.bone,
    fontFamily: typography.displayMedium,
    fontSize: 20,
    textDecorationLine: 'none',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  quantityButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: layout.minimumPressTarget,
    justifyContent: 'center',
    width: layout.minimumPressTarget,
  },
  remove: {
    justifyContent: 'center',
    minHeight: layout.minimumPressTarget,
    paddingHorizontal: spacing[2],
  },
  lineTotal: {
    minWidth: 110,
  },
});
