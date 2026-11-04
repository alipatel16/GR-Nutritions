import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import AboutRoute from '../../../../app/(store)/about';
import ContactRoute from '../../../../app/(store)/contact';
import HelpRoute from '../../../../app/(store)/help';
import PrivacyRoute from '../../../../app/(store)/privacy';
import TermsRoute from '../../../../app/(store)/terms';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: jest.fn(() => ({})),
}));

describe('company pages', () => {
  it('give each page one heading and the owner contact details', async () => {
    for (const [Page, title] of [
      [AboutRoute, 'About us'],
      [ContactRoute, 'Contact us'],
      [TermsRoute, 'Terms & conditions'],
      [PrivacyRoute, 'Privacy policy'],
    ] as const) {
      const { unmount } = await render(<Page />);
      expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
      await unmount();
    }
    await render(<ContactRoute />);
    expect(screen.getByLabelText('Call +91 74900 20905')).toBeOnTheScreen();
    expect(screen.getByLabelText('Call +91 63531 22140')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email grnutritionweb@gmail.com')).toBeOnTheScreen();
    expect(screen.getAllByText(/Rohit Tomar/).length).toBeGreaterThan(0);
  });

  it('prefills the order reference on the help page and ignores unsafe values', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.mocked(useLocalSearchParams).mockReturnValue({ order: 'GR-1042' });
    const { unmount } = await render(<HelpRoute />);
    expect(screen.getByText('Order reference: GR-1042')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('WhatsApp us'));
    expect(open).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/wa\.me\/917490020905\?text=.*GR-1042/));
    await unmount();

    jest.mocked(useLocalSearchParams).mockReturnValue({ order: '<script>' });
    await render(<HelpRoute />);
    expect(screen.queryByText(/Order reference/)).toBeNull();
    open.mockRestore();
  });
});
