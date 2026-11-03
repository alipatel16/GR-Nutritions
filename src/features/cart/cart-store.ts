import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Product } from '@/features/catalog/types';

import {
  addLine,
  CART_STORAGE_VERSION,
  emptyCart,
  removeLine,
  updateQuantity,
} from './cart-domain';
import type { Cart, CartVariantInput } from './types';

type CartStore = {
  cart: Cart;
  lastError: string | null;
  addProduct(product: Product, variantId: string, quantity?: number): void;
  updateItem(variantId: string, quantity: number): void;
  removeItem(variantId: string): void;
  clearCart(): void;
  clearError(): void;
};

function toCartVariant(
  product: Product,
  variantId: string,
): CartVariantInput | null {
  const variant = product.variants.find((item) => item.id === variantId);
  if (!variant) return null;

  return {
    variantId: variant.id,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    variantLabel: variant.label,
    unitPricePaise: variant.price.amountPaise,
    stockAvailable: variant.stockAvailable,
    imageColor: product.media[0]?.backgroundColor ?? '#191E22',
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cart: emptyCart(),
      lastError: null,
      addProduct(product, variantId, quantity = 1) {
        set((state) => {
          const variant = toCartVariant(product, variantId);
          if (!variant) return { lastError: 'Product option not found' };
          const result = addLine(state.cart, variant, quantity);
          return result.ok
            ? { cart: result.cart, lastError: null }
            : { lastError: result.error };
        });
      },
      updateItem(variantId, quantity) {
        set((state) => {
          const result = updateQuantity(state.cart, variantId, quantity);
          return result.ok
            ? { cart: result.cart, lastError: null }
            : { lastError: result.error };
        });
      },
      removeItem(variantId) {
        set((state) => ({
          cart: removeLine(state.cart, variantId),
          lastError: null,
        }));
      },
      clearCart() {
        set({ cart: emptyCart(), lastError: null });
      },
      clearError() {
        set({ lastError: null });
      },
    }),
    {
      name: 'gr-nutritions-cart',
      version: CART_STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
