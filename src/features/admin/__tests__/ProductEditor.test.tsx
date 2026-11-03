import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { makeProduct } from "../../../../test/factories/product";
import type { Product } from "@/features/catalog/types";
import { ProductEditor } from "../ProductEditor";
function Editor({
  initial = makeProduct({ status: "draft" }),
  onSave = jest.fn(),
}: {
  initial?: Product;
  onSave?: (product: Product) => void;
}) {
  const [product, setProduct] = useState(initial);
  return (
    <ProductEditor
      product={product}
      onChange={setProduct}
      onSave={onSave}
      onUpload={() => undefined}
      onClose={() => undefined}
      busy={false}
    />
  );
}
it("shows one section at a time and preserves typed fields across sections", async () => {
  await render(<Editor />);
  expect(screen.queryByLabelText("Selling price (₹)")).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText("Product name"),
    "Edited protein",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Variants & shipping" }),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Selling price (₹)"),
    "12.30",
  );
  expect(screen.getByLabelText("Selling price (₹)")).toHaveDisplayValue(
    "12.30",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Basics" }));
  expect(screen.getByLabelText("Product name")).toHaveDisplayValue(
    "Edited protein",
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Variants & shipping" }),
  );
  expect(screen.getByLabelText("Selling price (₹)")).toHaveDisplayValue(
    "12.30",
  );
});
it("moves from publish to an invalid field section and shows a friendly error summary", async () => {
  const save = jest.fn();
  await render(
    <Editor
      initial={makeProduct({ name: "", status: "draft" })}
      onSave={save}
    />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Publish" }));
  await fireEvent.press(screen.getByRole("button", { name: "Save product" }));
  expect(screen.getByLabelText("Product name")).toBeOnTheScreen();
  expect(
    screen.getByText("Please review the highlighted fields before saving."),
  ).toBeOnTheScreen();
  expect(save).not.toHaveBeenCalled();
});
