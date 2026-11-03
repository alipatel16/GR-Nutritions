import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Product photos are stored at most 1200 px on the long side as WebP at 80%:
// sharp on retina product pages, typically 40–150 KB instead of multi-MB originals.
export const PRODUCT_IMAGE_MAX_PX = 1200;
export const PRODUCT_IMAGE_QUALITY = 0.8;

export async function compressProductImage(uri: string): Promise<{ uri: string; mime: 'image/webp' }> {
  const rendered = await ImageManipulator.manipulate(uri, {
    maxWidth: PRODUCT_IMAGE_MAX_PX,
    maxHeight: PRODUCT_IMAGE_MAX_PX,
  }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.WEBP, compress: PRODUCT_IMAGE_QUALITY });
  return { uri: saved.uri, mime: 'image/webp' };
}
