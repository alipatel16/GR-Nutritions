import { useState } from 'react';
import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, layout, radii, spacing, shadows } from '@/theme/tokens';
import { useBreakpoint } from '@/theme/use-breakpoint';

import type { ProductMedia } from './types';

type ProductGalleryProps = {
  media: ProductMedia[];
  productName: string;
  demoContent?: boolean;
};

export function ProductGallery({
  media,
  productName,
  demoContent = false,
}: ProductGalleryProps) {
  const breakpoint = useBreakpoint();
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUris, setFailedUris] = useState<string[]>([]);
  const index = Math.min(activeIndex, Math.max(0, media.length - 1));
  const active = media[index];
  const hasPhoto = active?.uri && !failedUris.includes(active.uri);

  return (
    <View
      style={[styles.gallery, breakpoint !== 'desktop' && styles.mobileGallery]}
      testID="product-gallery"
    >
      <View style={styles.stage}>
        {hasPhoto ? (
          <Image
            accessibilityLabel={active.alt || productName}
            contentFit="contain"
            contentPosition="center"
            onError={() => setFailedUris((uris) => [...uris, active.uri!])}
            source={{ uri: active.uri }}
            style={styles.photo}
            testID="product-photo"
          />
        ) : (
          <View
            accessibilityLabel={
              active?.alt ?? `${productName} photo unavailable`
            }
            style={styles.placeholder}
          >
            <View style={styles.placeholderIcon}>
              <ImageIcon color={colors.violet} size={36} strokeWidth={1.25} />
            </View>
            <AppText style={styles.placeholderTitle} variant="title">
              {demoContent
                ? 'Sample product imagery'
                : 'Product photo coming soon'}
            </AppText>
            <AppText
              style={styles.placeholderCopy}
              tone="muted"
              variant="caption"
            >
              {demoContent
                ? 'A product photo has not been added to this sample.'
                : 'See the product details and available options alongside.'}
            </AppText>
          </View>
        )}
        {demoContent && hasPhoto ? (
          <View style={styles.sampleBadge}>
            <AppText variant="caption">Sample imagery</AppText>
          </View>
        ) : null}
      </View>
      {media.length > 1 ? (
        <View style={styles.controls}>
          <Pressable
            accessibilityLabel="Previous product image"
            accessibilityRole="button"
            onPress={() =>
              setActiveIndex((index - 1 + media.length) % media.length)
            }
            style={styles.control}
          >
            <ChevronLeft color={colors.bone} size={20} />
          </Pressable>
          <View style={styles.thumbnails}>
            {media.map((item, itemIndex) => (
              <Pressable
                accessibilityLabel={`View product image ${itemIndex + 1}`}
                accessibilityRole="button"
                accessibilityState={{ selected: itemIndex === index }}
                key={item.id}
                onPress={() => setActiveIndex(itemIndex)}
                style={[
                  styles.thumbnail,
                  itemIndex === index && styles.selectedThumbnail,
                ]}
              >
                {item.uri && !failedUris.includes(item.uri) ? (
                  <Image
                    source={{ uri: item.uri }}
                    contentFit="contain"
                    style={styles.thumbnailPhoto}
                  />
                ) : (
                  <ImageIcon
                    color={itemIndex === index ? colors.violet : colors.mineral}
                    size={20}
                  />
                )}
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityLabel="Next product image"
            accessibilityRole="button"
            onPress={() => setActiveIndex((index + 1) % media.length)}
            style={styles.control}
          >
            <ChevronRight color={colors.bone} size={20} />
          </Pressable>
        </View>
      ) : null}
      {media.length > 0 ? (
        <AppText
          accessibilityLiveRegion="polite"
          style={styles.caption}
          tone="muted"
          variant="caption"
        >
          {index + 1} / {media.length}
          {active?.uri ? ` · ${active.alt || productName}` : ''}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    gap: spacing[3],
    minWidth: 0,
  },
  mobileGallery: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: '100%',
    minWidth: 0,
  },
  stage: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
    ...shadows.card,
  },
  photo: { height: '86%', width: '86%' },
  placeholder: {
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[8],
    maxWidth: 370,
  },
  placeholderIcon: {
    alignItems: 'center',
    backgroundColor: colors.graphiteSurface,
    borderRadius: radii.pill,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  placeholderTitle: { color: colors.violet, textAlign: 'center' },
  placeholderCopy: { textAlign: 'center' },
  sampleBadge: {
    position: 'absolute',
    top: spacing[4],
    left: spacing[4],
    backgroundColor: colors.graphiteSurface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
  },
  thumbnails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 1,
    gap: spacing[2],
    justifyContent: 'center',
  },
  thumbnail: {
    alignItems: 'center',
    backgroundColor: colors.obsidianRaised,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  selectedThumbnail: {
    borderColor: colors.mint,
    borderWidth: 2,
    backgroundColor: colors.graphiteSurface,
  },
  thumbnailPhoto: { width: '80%', height: '80%' },
  control: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: layout.minimumPressTarget,
    justifyContent: 'center',
    width: layout.minimumPressTarget,
  },
  caption: { textAlign: 'center' },
});
