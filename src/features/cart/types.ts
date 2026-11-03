export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPricePaise: number;
  stockAvailable: number;
  imageColor: string;
};

export type Cart = {
  lines: CartLine[];
};

export type CartVariantInput = Omit<CartLine, 'quantity'>;

export type CartResult =
  { ok: true; cart: Cart } | { ok: false; cart: Cart; error: string };

export type CartTotals = {
  subtotalPaise: number;
  itemCount: number;
};
