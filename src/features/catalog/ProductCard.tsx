import { Link, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowRight, BadgeCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Price } from '@/components/ui/Price';
import { Surface } from '@/components/ui/Surface';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import type { Product } from './types';

type ProductCardProps = {
  product: Product;
  // Two-up phone grids drop secondary copy so name, price and action stay readable.
  compact?: boolean;
};

function titleCase(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const inStockVariants = product.variants.filter(
    (variant) => variant.stockAvailable > 0,
  );
  const variant = inStockVariants[0] ?? product.variants[0];
  const isSoldOut = inStockVariants.length === 0;
  const href = `/product/${product.slug}` as Href;
  const savingPercent = Math.max(
    0,
    Math.round(
      ((variant.mrp.amountPaise - variant.price.amountPaise) /
        variant.mrp.amountPaise) *
        100,
    ),
  );

  return (
    <Surface style={styles.card}>
      <View
        style={[
          styles.media,
          {
            backgroundColor:
              product.media[0]?.backgroundColor ?? colors.graphiteSurface,
          },
        ]}
      >
        <Image
          source={
            product.media[0]?.uri
              ? { uri: product.media[0].uri }
              : require('../../../assets/images/gr-campaign.png')
          }
          style={[
            StyleSheet.absoluteFill,
            product.media[0]?.uri ? (compact ? styles.packShotCompact : styles.packShot) : undefined,
          ]}
          contentFit={product.media[0]?.uri ? 'contain' : 'cover'}
          contentPosition="center"
          accessibilityLabel={product.media[0]?.alt ?? product.name}
        />
        <View style={styles.badgeRow}>
          <View style={styles.authentic}>
            <BadgeCheck color={colors.mint} size={12} />
            {compact && !product.demoContent ? null : (
              <AppText style={styles.authenticText}>
                {product.demoContent ? 'CONCEPT PACK' : 'AUTHENTIC'}
              </AppText>
            )}
          </View>
          {savingPercent > 0 ? (
            <AppText style={styles.savingLabel} variant="caption">
              SAVE {savingPercent}%
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={styles.metaRow}>
          <AppText numberOfLines={1} style={[styles.brand, compact && styles.brandCompact]}>
            {product.brand.toUpperCase()}
          </AppText>
          {isSoldOut ? (
            <AppText style={styles.soldOut} variant="caption">
              Sold out
            </AppText>
          ) : compact ? null : (
            <View style={styles.stockRow}>
              <View style={styles.stockDot} />
              <AppText style={styles.inStock} variant="caption">
                In stock
              </AppText>
            </View>
          )}
        </View>
        <AppText numberOfLines={2} style={[styles.name, compact && styles.nameCompact]}>
          {product.name}
        </AppText>
        {compact ? null : (
          <AppText numberOfLines={2} tone="muted" variant="caption">
            {product.summary}
          </AppText>
        )}
        <View style={styles.tags}>
          <AppText style={styles.tag} variant="caption">
            {titleCase(product.category)}
          </AppText>
          {product.dietaryTags.slice(0, compact ? 1 : 2).map((tag) => (
            <AppText key={tag} style={styles.tag} variant="caption">
              {titleCase(tag)}
            </AppText>
          ))}
        </View>
        <AppText numberOfLines={1} tone="muted" variant="caption">
          {variant.label} • {product.variants.length} option
          {product.variants.length === 1 ? '' : 's'}
        </AppText>
        <View style={styles.divider} />
        <Price
          amountPaise={variant.price.amountPaise}
          mrpPaise={variant.mrp.amountPaise}
          size={compact ? 'compact' : 'regular'}
        />
        <Link accessibilityLabel={`View ${product.name}`} asChild href={href}>
          <Pressable style={StyleSheet.flatten([styles.link, isSoldOut && styles.linkMuted])}>
            <AppText style={[styles.linkText, isSoldOut && styles.linkTextMuted]}>
              {isSoldOut ? 'View details' : compact ? 'View' : 'View & add to cart'}
            </AppText>
            <ArrowRight color={isSoldOut ? colors.ink : colors.mint} size={16} />
          </Pressable>
        </Link>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  media: {
    aspectRatio: 1.05,
    padding: spacing[3],
  },
  packShot: { margin: spacing[6] },
  packShotCompact: { margin: spacing[3] },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  authentic: {
    alignItems: 'center',
    backgroundColor: colors.graphite,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
  },
  authenticText: {
    color: colors.onDark,
    fontFamily: typography.bodyBold,
    fontSize: 9.5,
    letterSpacing: 1,
    lineHeight: 13,
  },
  savingLabel: {
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    color: colors.graphite,
    fontFamily: typography.bodyBold,
    fontSize: 10.5,
    lineHeight: 14,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
  },
  content: {
    flexGrow: 1,
    gap: spacing[2],
    padding: spacing[4],
  },
  contentCompact: { gap: 6, padding: spacing[3] },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    color: colors.mintInk,
    fontFamily: typography.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  brandCompact: { flexShrink: 1, fontSize: 10, letterSpacing: 0.8 },
  stockRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  stockDot: { backgroundColor: colors.success, borderRadius: 4, height: 7, width: 7 },
  inStock: { color: colors.success, fontFamily: typography.bodySemibold },
  soldOut: { color: colors.danger, fontFamily: typography.bodySemibold },
  name: {
    color: colors.ink,
    fontFamily: typography.bodyBold,
    fontSize: 17,
    lineHeight: 23,
  },
  nameCompact: { fontSize: 14, lineHeight: 19 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  tag: {
    backgroundColor: colors.graphiteSurface,
    borderRadius: radii.pill,
    color: colors.boneMuted,
    fontFamily: typography.bodySemibold,
    fontSize: 10.5,
    lineHeight: 14,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  divider: { backgroundColor: colors.line, height: 1, marginVertical: spacing[1] },
  link: {
    alignItems: 'center',
    backgroundColor: colors.graphite,
    borderRadius: radii.xs,
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    marginTop: spacing[2],
    minHeight: 46,
    paddingHorizontal: spacing[4],
  },
  linkMuted: { backgroundColor: colors.graphiteSurface },
  linkText: { color: colors.onDark, fontFamily: typography.bodyBold, fontSize: 13.5 },
  linkTextMuted: { color: colors.ink },
});
