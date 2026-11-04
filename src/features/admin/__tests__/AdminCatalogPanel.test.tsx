import { fireEvent, render, screen } from "@testing-library/react-native";
import { AdminCatalogPanel } from "../AdminCatalogPanel";
import { makeProduct } from "../../../../test/factories/product";

it("searches products and requires confirmation before recoverable deletion", async () => {
  const onRemove = jest.fn().mockResolvedValue(undefined);
  const products = [
    makeProduct({ id: "a", name: "Atlas Whey", brand: "Atlas" }),
    makeProduct({ id: "b", name: "Zen Creatine", brand: "Zen" }),
  ];
  await render(
    <AdminCatalogPanel
      products={products}
      busy={false}
      onEdit={jest.fn()}
      onRemove={onRemove}
    />,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Search products by name, brand or SKU"),
    "zen creatine",
  );
  expect(screen.queryByText("Atlas Whey")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Delete product" }));
  expect(onRemove).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: "Confirm delete product" }),
  );
  expect(onRemove).toHaveBeenCalledWith(products[1]);
});
