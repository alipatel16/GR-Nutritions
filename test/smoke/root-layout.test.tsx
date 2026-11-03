import { render, screen } from '@testing-library/react-native';

import StoreIndex from '../../app/(store)/index';

describe('storefront root', () => {
  it('introduces the brand and offers the primary shopping action', async () => {
    await render(<StoreIndex />);

    expect(
      screen.getByRole('header', { name: 'GOOD FUEL. GREAT POTENTIAL.' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('link', { name: 'Shop all supplements' }),
    ).toBeOnTheScreen();
  });
});
