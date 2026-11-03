import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { compressProductImage } from '../compress-image';

jest.mock('expo-image-manipulator', () => {
  const saveAsync = jest.fn(async () => ({ uri: 'file:///compressed.webp', width: 1200, height: 900 }));
  const renderAsync = jest.fn(async () => ({ saveAsync }));
  return {
    SaveFormat: { WEBP: 'webp' },
    ImageManipulator: { manipulate: jest.fn(() => ({ renderAsync })) },
  };
});

it('downscales to fit 1200 px and saves WebP at 80% quality', async () => {
  await expect(compressProductImage('file:///photo.jpg')).resolves.toEqual({ uri: 'file:///compressed.webp', mime: 'image/webp' });
  expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///photo.jpg', { maxWidth: 1200, maxHeight: 1200 });
  const context = jest.mocked(ImageManipulator.manipulate).mock.results[0].value;
  const rendered = await context.renderAsync.mock.results[0].value;
  expect(rendered.saveAsync).toHaveBeenCalledWith({ format: SaveFormat.WEBP, compress: 0.8 });
});
