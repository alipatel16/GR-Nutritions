import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { formatInr } from '@/lib/money';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

import type { ProductVariant } from './types';

type VariantPickerProps = {
  variants: ProductVariant[];
  selectedId: string;
  onSelect(variantId: string): void;
};

// Options as a compact grid of tiles (size/flavour + price) so every choice and
// the buy button fit on a phone screen.
export function VariantPicker({
  variants,
  selectedId,
  onSelect,
}: VariantPickerProps) {
  const breakpoint = useBreakpoint();
  const columns = breakpoint === 'mobile' ? 2 : 3;
  const basis = `${100 / columns}%` as `${number}%`;
  const selectedVariant = variants.find((variant) => variant.id === selectedId);

  return (
    <View style={styles.picker}>
      <View style={styles.heading}>
        <AppText variant="label">Choose your option</AppText>
        <AppText numberOfLines={1} style={styles.current} variant="caption">
          {selectedVariant?.label}
        </AppText>
      </View>
      <View style={styles.options}>
        {variants.map((variant) => {
          const selected = variant.id === selectedId;
          const soldOut = variant.stockAvailable === 0;
          const name = variant.flavour && variant.label.includes('•') ? variant.size : variant.label;
          const detail = variant.flavour && variant.label.includes('•') ? variant.flavour : '';
          return (
            <View key={variant.id} style={[styles.cell, { width: basis }]}>
              <Pressable
                accessibilityLabel={`Select ${variant.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(variant.id)}
                style={[
                  styles.option,
                  selected && styles.optionSelected,
                  soldOut && !selected && styles.optionSoldOut,
                ]}
              >
                <AppText numberOfLines={1} style={[styles.name, selected && styles.nameSelected]}>
                  {name}
                </AppText>
                {detail ? (
                  <AppText numberOfLines={1} style={[styles.detail, selected && styles.detailSelected]}>
                    {detail}
                  </AppText>
                ) : null}
                <AppText style={[styles.price, soldOut && styles.soldOut, selected && !soldOut && styles.priceSelected]}>
                  {soldOut ? 'Sold out' : formatInr(variant.price.amountPaise)}
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: spacing[3] },
  heading: { alignItems: 'baseline', flexDirection: 'row', gap: spacing[3], justifyContent: 'space-between' },
  current: { color: colors.mineral, flexShrink: 1, textAlign: 'right' },
  options: { flexDirection: 'row', flexWrap: 'wrap', margin: -4 },
  cell: { padding: 4 },
  option: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    gap: 2,
    minHeight: 64,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  optionSelected: { backgroundColor: colors.graphite, borderColor: colors.graphite },
  optionSoldOut: { backgroundColor: colors.graphiteSurface, opacity: 0.7 },
  name: { color: colors.ink, fontFamily: typography.bodyBold, fontSize: 14, lineHeight: 19 },
  nameSelected: { color: colors.onDark },
  detail: { color: colors.mineral, fontSize: 12, lineHeight: 16 },
  detailSelected: { color: colors.graphiteMuted },
  price: { color: colors.inkMuted, fontFamily: typography.bodySemibold, fontSize: 13, lineHeight: 18, marginTop: 'auto' },
  priceSelected: { color: colors.mint },
  soldOut: { color: colors.danger },
});
