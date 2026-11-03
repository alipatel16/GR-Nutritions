import { render, screen } from '@testing-library/react-native';

import { StoreFooter } from '../StoreFooter';

describe('StoreFooter', () => {
  it('keeps shopping, account, and help destinations available', async () => {
    await render(<StoreFooter />);

    expect(screen.getByRole('link', { name: 'Footer protein' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Footer brands' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Footer account' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Footer orders' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Footer GR Coach' })).toBeOnTheScreen();
  });
});
