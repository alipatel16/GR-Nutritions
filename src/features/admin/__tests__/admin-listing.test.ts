import { matchesSearch, salesMetrics } from "../admin-listing";
import type { AdminOrder } from "../admin-repository";

const order = (overrides: Partial<AdminOrder>): AdminOrder => ({
  id: "order",
  userId: "buyer",
  status: "paid",
  mode: "live",
  paymentMethod: "razorpay",
  totalPaise: 120000,
  subtotalPaise: 100000,
  shippingPaise: 20000,
  items: [],
  ...overrides,
});

it("counts paid online and delivered COD merchandise revenue while excluding tests, pending COD and refunds", () => {
  expect(
    salesMetrics([
      order({}),
      order({ paymentMethod: "cod", status: "delivered" }),
      order({ paymentMethod: "cod", status: "cod_confirmed" }),
      order({ mode: "test" }),
      order({ status: "payment_review" }),
      order({ status: "refunded" }),
      order({ status: "cancelled" }),
      order({ status: "payment_pending" }),
      order({ mode: undefined }),
    ]),
  ).toEqual({
    earningsPaise: 200000,
    pendingCodPaise: 120000,
    liveOrders: 7,
    paidOrders: 2,
  });
});

it("searches all supplied customer/product fields with case-insensitive multiword matching", () => {
  expect(matchesSearch(" ALI  411001 ", ["Ali Patel", "Pune", "411001"])).toBe(
    true,
  );
  expect(matchesSearch("ali 400001", ["Ali Patel", "Pune", "411001"])).toBe(
    false,
  );
  expect(matchesSearch("whey abc123", ["Chocolate Whey", "ABC123"])).toBe(true);
});
