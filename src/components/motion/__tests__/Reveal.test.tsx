import { render, screen } from '@testing-library/react-native';

import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/theme/use-reduced-motion';

import { Reveal } from '../Reveal';

jest.mock('@/theme/use-reduced-motion', () => ({
  useReducedMotion: jest.fn(() => true),
}));

describe('Reveal', () => {
  it('renders immediately without movement for reduced-motion customers', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);

    await render(
      <Reveal testID="reveal">
        <AppText>Ready now</AppText>
      </Reveal>,
    );

    expect(screen.getByText('Ready now')).toBeOnTheScreen();
    expect(screen.getByTestId('reveal')).toHaveStyle({ opacity: 1 });
  });
});
