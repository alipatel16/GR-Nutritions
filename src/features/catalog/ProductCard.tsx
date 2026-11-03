import { Link, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Price } from '@/components/ui/Price';
import { Surface } from '@/components/ui/Surface';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import type { Product } from './types';

type ProductCardProps = {
  product: Product;
};

function titleCase(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ProductCard({ product }: ProductCardProps) {
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
              product.media[0]?.backgroundColor ?? colors.graphite,
          },
        ]}
      >
        <Image
          source={
            product.media[0]?.uri
              ? { uri: product.media[0].uri }
              : require('../../../assets/images/gr-campaign.png')
          }
          style={StyleSheet.absoluteFill}
          contentFit={product.media[0]?.uri ? 'contain' : 'cover'}
          contentPosition="center"
          accessibilityLabel={product.media[0]?.alt ?? product.name}
        />
        <AppText style={styles.demoLabel} variant="caption">
          {product.demoContent ? 'CONCEPT PACK' : 'THE GR COLLECTION'}
        </AppText>
        {savingPercent > 0 ? (
          <AppText style={styles.savingLabel} variant="caption">
            SAVE {savingPercent}%
          </AppText>
        ) : null}
      </View>
      <View style={styles.content}>
        <AppText tone="muted" style={{ letterSpacing: 1, fontSize: 10 }}>
          {product.brand.toUpperCase()}
        </AppText>
        <View style={styles.metaRow}>
          <AppText tone="muted" variant="caption">
            {titleCase(product.category)}
          </AppText>
          {isSoldOut ? (
            <AppText tone="danger" variant="caption">
              Sold out
            </AppText>
          ) : (
            <AppText tone="accent" variant="caption">
              In stock
            </AppText>
          )}
        </View>
        <AppText numberOfLines={2} variant="title">
          {product.name}
        </AppText>
        <AppText numberOfLines={2} tone="muted" variant="caption">
          {product.summary}
        </AppText>
        <View style={styles.tags}>
          {product.dietaryTags.slice(0, 2).map((tag) => (
            <AppText key={tag} style={styles.tag} variant="caption">
              {titleCase(tag)}
            </AppText>
          ))}
        </View>
        <AppText tone="muted" variant="caption">
          {variant.label} • {product.variants.length} option
          {product.variants.length === 1 ? '' : 's'}
        </AppText>
        <View style={styles.bottomRow}>
          <Price
            amountPaise={variant.price.amountPaise}
            mrpPaise={variant.mrp.amountPaise}
            size="compact"
          />
          <Link
            accessibilityLabel={`View ${product.name}`}
            href={href}
            style={styles.link}
          >
            View
          </Link>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: colors.obsidianRaised,
  },
  media: {
    aspectRatio: 1.12,
    justifyContent: 'space-between',
    padding: spacing[5],
  },
  mediaMark: {
    color: colors.obsidian,
  },
  demoLabel: {
    alignSelf: 'flex-start',
    backgroundColor: colors.obsidian,
    color: colors.bone,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  savingLabel: {
    alignSelf: 'flex-end',
    backgroundColor: colors.lime,
    color: '#FFF',
    fontFamily: typography.bodyBold,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  content: {
    gap: spacing[3],
    padding: spacing[5],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  tag: {
    backgroundColor: colors.graphite,
    borderRadius: radii.pill,
    color: colors.boneMuted,
    fontSize: 9,
    lineHeight: 14,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[3],
    justifyContent: 'space-between',
  },
  link: {
    color: colors.lime,
    fontFamily: typography.bodyBold,
    minHeight: 44,
    paddingVertical: spacing[3],
    textDecorationLine: 'none',
  },
});
