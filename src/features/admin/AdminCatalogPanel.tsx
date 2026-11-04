import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { formatInr } from "@/lib/money";
import type { Product } from "@/features/catalog/types";
import { AdminSearch, AdminSelect } from "./AdminListControls";
import { matchesSearch, productStock } from "./admin-listing";

const label = (value: string) => value.replaceAll("-", " ");
const optionsFor = (values: string[], all: string) => [
  { value: "", label: all },
  ...[...new Set(values)]
    .sort()
    .map((value) => ({ value, label: label(value) })),
];

export function AdminCatalogPanel({
  products,
  busy,
  onEdit,
  onRemove,
}: {
  products: Product[];
  busy: boolean;
  onEdit(product: Product): void;
  onRemove(product: Product): Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [stock, setStock] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState<Product | null>(null);
  const price = (product: Product) =>
    Math.min(...product.variants.map((variant) => variant.price.amountPaise));
  const filtered = products
    .filter(
      (product) =>
        (!brand || product.brand === brand) &&
        (!category || product.category === category) &&
        (status ? product.status === status : product.status !== "archived") &&
        (!stock ||
          (stock === "out"
            ? productStock(product) === 0
            : product.variants.some(
                (variant) => variant.stockAvailable < 5,
              ))) &&
        matchesSearch(search, [
          product.name,
          product.brand,
          product.category,
          product.id,
          ...product.variants.flatMap((variant) => [
            variant.sku,
            variant.label,
          ]),
        ]),
    )
    .sort((a, b) => {
      if (sort === "price-asc")
        return price(a) - price(b) || a.id.localeCompare(b.id);
      if (sort === "price-desc")
        return price(b) - price(a) || a.id.localeCompare(b.id);
      if (sort === "stock")
        return productStock(a) - productStock(b) || a.id.localeCompare(b.id);
      if (sort === "newest")
        return (
          Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
          a.id.localeCompare(b.id)
        );
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
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
        label="Search products by name, brand or SKU"
        value={search}
        onChange={change(setSearch)}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <AdminSelect
          label="Brand"
          value={brand}
          options={optionsFor(
            products.map((product) => product.brand),
            "All brands",
          )}
          onChange={change(setBrand)}
        />
        <AdminSelect
          label="Product type"
          value={category}
          options={optionsFor(
            products.map((product) => product.category),
            "All types",
          )}
          onChange={change(setCategory)}
        />
        <AdminSelect
          label="Status"
          value={status}
          options={[
            { value: "", label: "Active & draft" },
            ...["active", "draft", "archived"].map((value) => ({
              value,
              label: label(value),
            })),
          ]}
          onChange={change(setStatus)}
        />
        <AdminSelect
          label="Inventory"
          value={stock}
          options={[
            { value: "", label: "All stock" },
            { value: "low", label: "Low stock (under 5)" },
            { value: "out", label: "Out of stock" },
          ]}
          onChange={change(setStock)}
        />
        <AdminSelect
          label="Sort products"
          value={sort}
          options={[
            { value: "name", label: "Name A–Z" },
            { value: "newest", label: "Newest first" },
            { value: "price-asc", label: "Price low to high" },
            { value: "price-desc", label: "Price high to low" },
            { value: "stock", label: "Lowest stock first" },
          ]}
          onChange={change(setSort)}
        />
      </View>
      <AppText variant="caption" accessibilityLiveRegion="polite">
        {filtered.length} products · Page {currentPage} of {pages}
      </AppText>
      {removing && (
        <View
          style={{
            backgroundColor: "#FFF",
            borderRadius: 10,
            padding: 20,
            gap: 12,
          }}
        >
          <AppText variant="label">Delete {removing.name}?</AppText>
          <AppText variant="caption">
            This removes the product from the store. Find it under Archived to
            restore it. Existing orders retain their details.
          </AppText>
          <Button
            loading={busy}
            onPress={async () => {
              await onRemove(removing);
              setRemoving(null);
            }}
          >
            Confirm delete product
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onPress={() => setRemoving(null)}
          >
            Cancel deletion
          </Button>
        </View>
      )}
      {filtered
        .slice((currentPage - 1) * 25, currentPage * 25)
        .map((product) => (
          <View
            key={product.id}
            style={{
              backgroundColor: "#FFF",
              padding: 20,
              borderRadius: 9,
              gap: 10,
            }}
          >
            <AppText variant="label" onPress={() => onEdit(product)}>
              {product.name}
            </AppText>
            <AppText tone="muted" variant="caption">
              {product.brand} · {label(product.category)} · {product.status}
            </AppText>
            <AppText variant="caption">
              {product.variants.length} options · {productStock(product)} units
              · From {formatInr(price(product))}
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <Button
                variant="ghost"
                disabled={busy}
                onPress={() => onEdit(product)}
              >
                {product.status === "archived"
                  ? "Edit / restore product"
                  : "Edit product"}
              </Button>
              {product.status !== "archived" && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onPress={() => setRemoving(product)}
                >
                  Delete product
                </Button>
              )}
            </View>
          </View>
        ))}
      {!filtered.length && (
        <AppText tone="muted">No products match these filters.</AppText>
      )}
      {pages > 1 && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            variant="ghost"
            disabled={currentPage === 1}
            onPress={() => setPage(currentPage - 1)}
          >
            Previous products
          </Button>
          <Button
            variant="ghost"
            disabled={currentPage === pages}
            onPress={() => setPage(currentPage + 1)}
          >
            Next products
          </Button>
        </View>
      )}
    </View>
  );
}
