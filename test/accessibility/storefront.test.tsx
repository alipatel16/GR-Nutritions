import { act, fireEvent, render, screen } from '@testing-library/react-native';

import AccountRoute from '../../app/(store)/account';
import AdvisorRoute from '../../app/(store)/advisor';
import { Button } from '@/components/ui/Button';
import { ProductCard } from '@/features/catalog/ProductCard';
import { focus, motion } from '@/theme/tokens';
import { makeProduct } from '../factories/product';

describe('storefront accessibility', () => {
  it('gives each milestone screen one clear primary heading and useful links', async () => {
    const { unmount } = await render(<AdvisorRoute />);

    expect(screen.getAllByRole('header')).toHaveLength(1);
    expect(screen.getByRole('header')).toHaveTextContent(/YOUR GOAL/);
    expect(screen.getByLabelText('Message GR Coach')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Send message' }),
    ).toBeDisabled();

    await unmount();
    await render(<AccountRoute />);

    expect(screen.getAllByRole('header')).toHaveLength(1);
    expect(screen.getByRole('header')).toHaveTextContent(/WELCOME/);
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeOnTheScreen();
  });

  it('exposes a meaningful alternative for product artwork', async () => {
    const product = makeProduct({
      media: [
        {
          id: 'media-accessible',
          alt: 'Matte black protein jar on a signal-lime background',
          backgroundColor: '#C7FF3D',
          sortOrder: 0,
        },
      ],
    });

    await render(<ProductCard product={product} />);

    expect(
      screen.getByLabelText(
        'Matte black protein jar on a signal-lime background',
      ),
    ).toBeOnTheScreen();
  });

  it('has a visible focus treatment and preserves button state', async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Add to cart</Button>);
    const button = screen.getByRole('button', { name: 'Add to cart' });

    await act(() => {
      fireEvent(button, 'focus');
    });
    expect(button).toHaveStyle({ borderColor: focus.color });
    expect(focus.width).toBeGreaterThanOrEqual(2);
    expect(motion.reduced).toBe(0);

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
