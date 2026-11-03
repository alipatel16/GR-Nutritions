import { formatInr } from '../money';

describe('formatInr', () => {
  it.each([
    [249900, '₹2,499'],
    [0, '₹0'],
    [-12500, '-₹125'],
  ])('formats %i paise as %s', (paise, expected) => {
    expect(formatInr(paise)).toBe(expected);
  });
});
