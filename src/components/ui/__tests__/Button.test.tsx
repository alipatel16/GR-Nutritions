import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from '../Button';

describe('Button', () => {
  it('does not invoke its action while disabled', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();

    await render(
      <Button disabled onPress={onPress}>
        Unavailable
      </Button>,
    );

    await user.press(screen.getByRole('button', { name: 'Unavailable' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('announces a busy state while loading', async () => {
    await render(
      <Button loading onPress={() => undefined}>
        Adding to cart
      </Button>,
    );

    expect(screen.getByRole('button', { name: 'Adding to cart' })).toBeBusy();
  });
});
it('preserves selected accessibility state while applying busy and disabled state', async () => {
  await render(<Button accessibilityState={{ selected: true }}>Selected option</Button>);
  expect(screen.getByRole('button', { name: 'Selected option' })).toBeSelected();
});
