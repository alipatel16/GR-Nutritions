import type {
  Cart,
  CartLine,
  CartResult,
  CartTotals,
  CartVariantInput,
} from './types';

export const CART_STORAGE_VERSION = 1;

export function emptyCart(): Cart {
  return { lines: [] };
}

function invalidQuantity(quantity: number): boolean {
  return !Number.isInteger(quantity) || quantity < 1;
}

function failure(cart: Cart, error: string): CartResult {
  return { ok: false, cart, error };
}

export function addLine(
  cart: Cart,
  variant: CartVariantInput,
  quantity: number,
): CartResult {
  if (invalidQuantity(quantity)) {
    return failure(cart, 'Quantity must be a whole number greater than zero');
  }

  if (variant.stockAvailable === 0) {
    return failure(cart, 'This option is sold out');
  }

  const existing = cart.lines.find(
    (line) => line.variantId === variant.variantId,
  );
  const nextQuantity = (existing?.quantity ?? 0) + quantity;

  if (nextQuantity > variant.stockAvailable) {
    return failure(cart, `Only ${variant.stockAvailable} available`);
  }

  const nextLine: CartLine = { ...variant, quantity: nextQuantity };
  const lines = existing
    ? cart.lines.map((line) =>
        line.variantId === variant.variantId ? nextLine : line,
      )
    : [...cart.lines, nextLine];

  return { ok: true, cart: { lines } };
}

export function updateQuantity(
  cart: Cart,
  variantId: string,
  quantity: number,
): CartResult {
  const line = cart.lines.find((item) => item.variantId === variantId);

  if (!line) {
    return failure(cart, 'Cart item not found');
  }

  if (quantity === 0) {
    return { ok: true, cart: removeLine(cart, variantId) };
  }

  if (invalidQuantity(quantity)) {
    return failure(cart, 'Quantity must be a whole number greater than zero');
  }

  if (quantity > line.stockAvailable) {
    return failure(cart, `Only ${line.stockAvailable} available`);
  }

  return {
    ok: true,
    cart: {
      lines: cart.lines.map((item) =>
        item.variantId === variantId ? { ...item, quantity } : item,
      ),
    },
  };
}

export function removeLine(cart: Cart, variantId: string): Cart {
  return { lines: cart.lines.filter((line) => line.variantId !== variantId) };
}

export function cartTotals(cart: Cart): CartTotals {
  return cart.lines.reduce<CartTotals>(
    (totals, line) => ({
      itemCount: totals.itemCount + line.quantity,
      subtotalPaise: totals.subtotalPaise + line.unitPricePaise * line.quantity,
    }),
    { subtotalPaise: 0, itemCount: 0 },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCartLine(value: unknown): value is CartLine {
  if (!isRecord(value)) return false;

  return (
    typeof value.variantId === 'string' &&
    typeof value.productId === 'string' &&
    typeof value.productSlug === 'string' &&
    typeof value.productName === 'string' &&
    typeof value.variantLabel === 'string' &&
    Number.isInteger(value.quantity) &&
    typeof value.quantity === 'number' &&
    value.quantity > 0 &&
    Number.isInteger(value.unitPricePaise) &&
    typeof value.unitPricePaise === 'number' &&
    Number.isInteger(value.stockAvailable) &&
    typeof value.stockAvailable === 'number' &&
    typeof value.imageColor === 'string'
  );
}

export function rehydrateCart(value: unknown): Cart {
  if (!isRecord(value) || value.version !== CART_STORAGE_VERSION) {
    return emptyCart();
  }

  const state = value.state;
  if (
    !isRecord(state) ||
    !isRecord(state.cart) ||
    !Array.isArray(state.cart.lines)
  ) {
    return emptyCart();
  }

  return state.cart.lines.every(isCartLine)
    ? { lines: state.cart.lines }
    : emptyCart();
}
