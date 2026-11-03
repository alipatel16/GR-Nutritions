import { act, render, screen, userEvent } from '@testing-library/react-native';

import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/theme/use-reduced-motion';

import { Carousel } from '../Carousel';

jest.mock('@/theme/use-reduced-motion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

const mockedUseReducedMotion = jest.mocked(useReducedMotion);

function ExampleCarousel({ autoAdvanceMs }: { autoAdvanceMs?: number }) {
  return (
    <Carousel
      accessibilityLabel="Featured campaigns"
      autoAdvanceMs={autoAdvanceMs}
      itemWidth={320}
      items={['Alpha', 'Beta', 'Gamma']}
      renderItem={(item) => <AppText>{item}</AppText>}
    />
  );
}

describe('Carousel', () => {
  beforeEach(() => {
    mockedUseReducedMotion.mockReturnValue(false);
    jest.useRealTimers();
  });

  it('moves the selected indicator with next and previous controls', async () => {
    const user = userEvent.setup();
    await render(<ExampleCarousel />);

    expect(screen.getByLabelText('Featured campaigns item 1 of 3')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );

    await user.press(screen.getByRole('button', { name: 'Next featured campaigns' }));
    expect(screen.getByLabelText('Featured campaigns item 2 of 3')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );

    await user.press(screen.getByRole('button', { name: 'Previous featured campaigns' }));
    expect(screen.getByLabelText('Featured campaigns item 1 of 3')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );
  });

  it('suppresses paging controls for one item', async () => {
    await render(
      <Carousel
        accessibilityLabel="Single campaign"
        itemWidth={320}
        items={['Only']}
        renderItem={(item) => <AppText>{item}</AppText>}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Next single campaign' })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(/Single campaign item/)).not.toBeOnTheScreen();
  });

  it('does not autoplay when reduced motion is enabled', async () => {
    jest.useFakeTimers();
    mockedUseReducedMotion.mockReturnValue(true);
    await render(<ExampleCarousel autoAdvanceMs={1000} />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByLabelText('Featured campaigns item 1 of 3')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );
  });
});
