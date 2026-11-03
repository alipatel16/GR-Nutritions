import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, layout, radii, spacing } from '@/theme/tokens';

import type { ProductVariant } from './types';

type VariantPickerProps = {
  variants: ProductVariant[];
  selectedId: string;
  onSelect(variantId: string): void;
};

export function VariantPicker({
  variants,
  selectedId,
  onSelect,
}: VariantPickerProps) {
  return (
    <View style={styles.picker}>
      <AppText variant="label">Choose your option</AppText>
      <View style={styles.options}>
        {variants.map((variant) => {
          const selected = variant.id === selectedId;
          const soldOut = variant.stockAvailable === 0;
          return (
            <Pressable
              accessibilityLabel={`Select ${variant.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={variant.id}
              onPress={() => onSelect(variant.id)}
              style={[
                styles.option,
                selected ? styles.optionSelected : undefined,
              ]}
            >
              <View
                style={[styles.indicator, selected && styles.indicatorSelected]}
              >
                {selected ? (
                  <Check
                    color={colors.obsidianRaised}
                    size={12}
                    strokeWidth={3}
                  />
                ) : null}
              </View>
              <View style={styles.copy}>
                <AppText
                  style={selected ? styles.optionTextSelected : undefined}
                  variant="label"
                >
                  {variant.label}
                </AppText>
                <AppText
                  style={selected ? styles.optionTextSelected : undefined}
                  tone={soldOut ? 'danger' : 'muted'}
                  variant="caption"
                >
                  {soldOut ? 'Sold out' : `${variant.stockAvailable} available`}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: spacing[3],
  },
  options: {
    gap: spacing[2],
  },
  option: {
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: layout.minimumPressTarget,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  optionSelected: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.gold,
  },
  optionTextSelected: {
    color: colors.violet,
  },
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.pill,
  },
  indicatorSelected: {
    backgroundColor: colors.midnight,
    borderColor: colors.gold,
    borderWidth: 2,
  },
  copy: { flex: 1, gap: spacing[1], minWidth: 0 },
});
