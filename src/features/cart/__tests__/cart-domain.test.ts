import {
  addLine,
  cartTotals,
  emptyCart,
  rehydrateCart,
  removeLine,
  updateQuantity,
} from '../cart-domain';
import type { CartVariantInput } from '../types';

const variant: CartVariantInput = {
  variantId: 'variant-1',
  productId: 'product-1',
  productSlug: 'product-1',
  productName: 'Performance Protein',
  variantLabel: 'Cocoa • 1 kg',
  unitPricePaise: 199995,
  stockAvailable: 4,
  imageColor: '#C7FF3D',
};

describe('cart domain', () => {
  it('merges repeated additions of the same variant', () => {
    const first = addLine(emptyCart(), variant, 1);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = addLine(first.cart, variant, 2);

    expect(second).toMatchObject({
      ok: true,
      cart: { lines: [{ variantId: 'variant-1', quantity: 3 }] },
    });
  });

  it('removes a line when quantity is updated to zero', () => {
    const added = addLine(emptyCart(), variant, 2);
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const updated = updateQuantity(added.cart, variant.variantId, 0);

    expect(updated).toEqual({ ok: true, cart: emptyCart() });
  });

  it('rejects quantities above available stock', () => {
    expect(addLine(emptyCart(), variant, 5)).toMatchObject({
      ok: false,
      error: 'Only 4 available',
    });
  });

  it('rejects out-of-stock variants', () => {
    expect(
      addLine(emptyCart(), { ...variant, stockAvailable: 0 }, 1),
    ).toMatchObject({ ok: false, error: 'This option is sold out' });
  });

  it.each([-1, 1.5])('rejects invalid quantity %p', (quantity) => {
    expect(addLine(emptyCart(), variant, quantity)).toMatchObject({
      ok: false,
      error: 'Quantity must be a whole number greater than zero',
    });
  });

  it('calculates item count and subtotal using integer paise', () => {
    const first = addLine(emptyCart(), variant, 2);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = addLine(
      first.cart,
      { ...variant, variantId: 'variant-2', unitPricePaise: 50005 },
      1,
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(cartTotals(second.cart)).toEqual({
      subtotalPaise: 449995,
      itemCount: 3,
    });
  });

  it('removes a line explicitly', () => {
    const added = addLine(emptyCart(), variant, 1);
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    expect(removeLine(added.cart, variant.variantId)).toEqual(emptyCart());
  });

  it('starts empty when persisted storage has an unknown version', () => {
    const restored = rehydrateCart({
      version: 999,
      state: { cart: { lines: [{ ...variant, quantity: 1 }] } },
    });

    expect(restored).toEqual(emptyCart());
  });
});
