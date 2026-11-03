import { render, screen } from '@testing-library/react-native';

import { makeProduct } from '../../../../test/factories/product';
import { ProductCard } from '../ProductCard';

describe('ProductCard', () => {
  it('shows useful catalogue metadata without inventing ratings or claims', async () => {
    await render(
      <ProductCard
        product={makeProduct({ dietaryTags: ['vegetarian', 'gluten-free'] })}
      />,
    );

    expect(screen.getByText('Vegetarian')).toBeOnTheScreen();
    expect(screen.getByText('Gluten Free')).toBeOnTheScreen();
    expect(screen.getByText('Chocolate • 1 kg • 1 option')).toBeOnTheScreen();
  });
});
