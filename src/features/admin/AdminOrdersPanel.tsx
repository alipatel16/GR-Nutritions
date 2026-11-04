import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { orderStatusLabel } from "@/features/checkout/checkout-service";
import type { AdminOrder } from "./admin-repository";
import { AdminOrderCard } from "./AdminOrderCard";
import { AdminSearch, AdminSelect } from "./AdminListControls";
import { matchesSearch } from "./admin-listing";

export function AdminOrdersPanel({
  orders,
  onChanged,
}: {
  orders: AdminOrder[];
  onChanged(): void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [mode, setMode] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const filtered = orders
    .filter(
      (order) =>
        (!status || order.status === status) &&
        (!payment || order.paymentMethod === payment) &&
        (!mode || order.mode === mode) &&
        matchesSearch(search, [
          order.id,
          order.userId,
          order.tracking?.awb,
          order.tracking?.courierName,
          ...Object.values(order.address ?? {}),
          ...order.items.map((item) => item.productName),
        ]),
    )
    .sort((a, b) => {
      if (sort === "amount-desc")
        return b.totalPaise - a.totalPaise || a.id.localeCompare(b.id);
      if (sort === "amount-asc")
        return a.totalPaise - b.totalPaise || a.id.localeCompare(b.id);
      const date =
        (Date.parse(b.createdAt ?? "") || 0) -
        (Date.parse(a.createdAt ?? "") || 0);
      return (sort === "oldest" ? -date : date) || a.id.localeCompare(b.id);
    });
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  function change(set: (value: string) => void) {
    return (value: string) => {
      set(value);
      setPage(1);
    };
  }
  return (
    <View style={{ gap: 16 }}>
      <AdminSearch
        label="Search orders by ID, customer, phone, product or AWB"
        value={search}
        onChange={change(setSearch)}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <AdminSelect
          label="Order status"
          value={status}
          options={[
            { value: "", label: "All statuses" },
            ...[...new Set(orders.map((order) => order.status))]
              .sort()
              .map((value) => ({ value, label: orderStatusLabel(value) })),
          ]}
          onChange={change(setStatus)}
        />
        <AdminSelect
          label="Payment"
          value={payment}
          options={[
            { value: "", label: "All methods" },
            { value: "razorpay", label: "Online payment" },
            { value: "cod", label: "Cash on delivery" },
          ]}
          onChange={change(setPayment)}
        />
        <AdminSelect
          label="Order mode"
          value={mode}
          options={[
            { value: "", label: "Live & test" },
            { value: "live", label: "Live orders" },
            { value: "test", label: "Test orders" },
          ]}
          onChange={change(setMode)}
        />
        <AdminSelect
          label="Sort orders"
          value={sort}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "amount-desc", label: "Highest amount" },
            { value: "amount-asc", label: "Lowest amount" },
          ]}
          onChange={change(setSort)}
        />
      </View>
      <AppText variant="caption" accessibilityLiveRegion="polite">
        {filtered.length} orders · Page {currentPage} of {pages}
      </AppText>
      {filtered.slice((currentPage - 1) * 20, currentPage * 20).map((order) => (
        <AdminOrderCard key={order.id} order={order} onChanged={onChanged} />
      ))}
      {!filtered.length && (
        <AppText tone="muted">No orders match these filters.</AppText>
      )}
      {pages > 1 && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            variant="ghost"
            disabled={currentPage === 1}
            onPress={() => setPage(currentPage - 1)}
          >
            Previous orders
          </Button>
          <Button
            variant="ghost"
            disabled={currentPage === pages}
            onPress={() => setPage(currentPage + 1)}
          >
            Next orders
          </Button>
        </View>
      )}
    </View>
  );
}
