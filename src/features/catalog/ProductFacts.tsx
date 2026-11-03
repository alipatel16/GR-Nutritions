import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Surface } from '@/components/ui/Surface';
import { colors, radii, spacing } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

import type { Product } from './types';

type ProductFactsProps = { product: Product };

export function ProductFacts({ product }: ProductFactsProps) {
  const isDesktop = useBreakpoint() === 'desktop';
  return (
    <View style={[styles.section, !isDesktop && styles.stacked]}>
      <View
        testID="product-facts-description"
        style={[styles.details, !isDesktop && styles.fullWidth]}
      >
        <View style={styles.block}>
          <AppText style={styles.heading} variant="heading">
            Product details
          </AppText>
          <AppText tone="muted">{product.description}</AppText>
        </View>
        {product.ingredients.length > 0 ? (
          <View style={styles.block}>
            <AppText variant="title">What’s inside</AppText>
            <View style={styles.ingredients}>
              {product.ingredients.map((ingredient) => (
                <View key={ingredient.name} style={styles.ingredient}>
                  <View style={styles.ingredientCopy}>
                    <AppText variant="label">{ingredient.name}</AppText>
                    {ingredient.note ? (
                      <AppText tone="muted" variant="caption">
                        {ingredient.note}
                      </AppText>
                    ) : null}
                  </View>
                  {ingredient.amount ? (
                    <AppText style={styles.amount} variant="label">
                      {ingredient.amount}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {product.dietaryTags.length > 0 ? (
          <View style={styles.tags}>
            {product.dietaryTags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <AppText tone="muted" variant="caption">
                  {tag.replace(/-/g, ' ')}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <Surface
        testID="product-facts-label-notes"
        style={[styles.compliance, !isDesktop && styles.fullWidth]}
        tone="outlined"
      >
        <View style={styles.block}>
          <AppText variant="title">How to use</AppText>
          <AppText tone="muted">
            {product.usage ||
              'Follow the serving instructions on the product pack.'}
          </AppText>
        </View>
        {product.warnings.length > 0 ? (
          <View style={styles.block}>
            <AppText variant="title">Warnings & label notes</AppText>
            {product.warnings.map((warning) => (
              <View key={warning} style={styles.warningRow}>
                <View style={styles.bullet} />
                <AppText style={styles.warningCopy} tone="muted">
                  {warning}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
        <AppText tone="muted" variant="caption">
          Always read the product label before use.
        </AppText>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[12] },
  stacked: { flexDirection: 'column', gap: spacing[8] },
  details: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    gap: spacing[6],
  },
  fullWidth: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', width: '100%' },
  block: { gap: spacing[4], minWidth: 0 },
  heading: { color: colors.violet },
  ingredients: { borderTopColor: colors.line, borderTopWidth: 1 },
  ingredient: {
    alignItems: 'flex-start',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'space-between',
    paddingVertical: spacing[4],
  },
  ingredientCopy: { flex: 1, gap: spacing[1], minWidth: 0 },
  amount: { color: colors.violet, flexShrink: 1, textAlign: 'right' },
  compliance: {
    flexGrow: 0.9,
    flexShrink: 1,
    flexBasis: 0,
    gap: spacing[6],
    minWidth: 0,
    padding: spacing[6],
    borderRadius: radii.md,
    backgroundColor: colors.graphiteSurface,
  },
  warningRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing[3],
  },
  bullet: {
    backgroundColor: colors.mineral,
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
  },
  warningCopy: { flex: 1, minWidth: 0 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  tag: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
});
