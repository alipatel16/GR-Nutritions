import { render, screen, userEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { HeroCarousel } from '../HeroCarousel';

describe('HeroCarousel', () => {
  beforeEach(() => {
    Dimensions.set({
      window: { width: 390, height: 844, scale: 1, fontScale: 1 },
      screen: { width: 390, height: 844, scale: 1, fontScale: 1 },
    });
  });

  it('offers three distinct campaigns and manual paging', async () => {
    const user = userEvent.setup();
    await render(<HeroCarousel />);

    expect(screen.getByText('GOOD FUEL. GREAT POTENTIAL.')).toBeOnTheScreen();
    expect(screen.getByText('BUILD YOUR EVERYDAY STACK.')).toBeOnTheScreen();
    expect(screen.getByText('RECOVERY COUNTS, TOO.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Store campaigns item 1 of 3')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );

    await user.press(screen.getByRole('button', { name: 'Next store campaigns' }));

    expect(screen.getByLabelText('Store campaigns item 2 of 3')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );
  });
});
