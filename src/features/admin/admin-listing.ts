import type { Product } from "@/features/catalog/types";
import type { AdminOrder } from "./admin-repository";

export function matchesSearch(query: string, values: unknown[]) {
  const text = values.filter(Boolean).join(" ").toLocaleLowerCase();
  return query
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .every((term) => text.includes(term));
}

export function productStock(product: Product) {
  return product.variants.reduce(
    (total, variant) => total + variant.stockAvailable,
    0,
  );
}

export function salesMetrics(orders: AdminOrder[]) {
  const live = orders.filter((order) => order.mode === "live");
  const earned = live.filter((order) =>
    order.paymentMethod === "razorpay"
      ? ["paid", "processing", "shipped", "delivered"].includes(order.status)
      : order.paymentMethod === "cod" && order.status === "delivered",
  );
  const pendingCod = live.filter(
    (order) =>
      order.paymentMethod === "cod" &&
      ["cod_confirmed", "processing", "shipped"].includes(order.status),
  );
  return {
    earningsPaise: earned.reduce(
      (sum, order) =>
        sum +
        (order.discountedSubtotalPaise ??
          (order.subtotalPaise !== undefined ? Math.max(0, order.subtotalPaise - (order.discountPaise ?? 0)) : undefined) ??
          Math.max(
            0,
            order.totalPaise -
              (order.shippingPaise ?? 0) -
              (order.codFeePaise ?? 0),
          )),
      0,
    ),
    pendingCodPaise: pendingCod.reduce(
      (sum, order) => sum + order.totalPaise,
      0,
    ),
    liveOrders: live.length,
    paidOrders: earned.length,
  };
}
