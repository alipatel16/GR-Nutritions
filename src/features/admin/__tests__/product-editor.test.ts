import { makeProduct } from "../../../../test/factories/product";
import {
  createNumberDrafts,
  validateProductDraft,
  parseRupees,
  sectionForField,
} from "../product-editor";

describe("product draft validation", () => {
  it.each([
    ["12.30", 1230],
    ["0.29", 29],
    ["999.99", 99999],
    ["12.", 1200],
    ["", null],
    ["1.234", null],
    ["1e3", null],
  ])("converts %s exactly at save time", (input, expected) => {
    expect(parseRupees(input as string)).toBe(expected);
  });
  it("keeps a decimal draft intact and carries concurrency metadata through save", () => {
    const product = {
      ...makeProduct({ status: "draft" }),
      updatedAt: "2026-11-01T10:00:00.000Z",
    };
    const numbers = createNumberDrafts(product);
    numbers[product.variants[0].id].price = "12.30";
    const result = validateProductDraft(product, numbers);
    expect(numbers[product.variants[0].id].price).toBe("12.30");
    expect(result.product?.variants[0].price.amountPaise).toBe(1230);
    expect(result.product?.updatedAt).toBe("2026-11-01T10:00:00.000Z");
    expect(result.product?.variants[0]).not.toHaveProperty("shipping");
  });
  it("identifies the correct section and friendly price feedback", () => {
    const product = makeProduct({ status: "draft" });
    const numbers = createNumberDrafts(product);
    numbers[product.variants[0].id].price = "abc";
    const result = validateProductDraft(product, numbers);
    expect(result.product).toBeUndefined();
    expect(result.errors["variants.0.price"]).toMatch(/selling price/i);
    expect(sectionForField("variants.0.price")).toBe("variants");
  });
  it("rejects partial packed dimensions without filling invented values", () => {
    const product = makeProduct({ status: "draft" });
    const numbers = createNumberDrafts(product);
    numbers[product.variants[0].id].lengthCm = "12.5";
    const result = validateProductDraft(product, numbers);
    expect(result.product).toBeUndefined();
    expect(result.errors["variants.0.shipping.weightGrams"]).toMatch(
      /packed weight/i,
    );
    expect(result.errors["variants.0.shipping.widthCm"]).toBeUndefined();
  });
  it("checks price against MRP with inline feedback", () => {
    const product = makeProduct({ status: "draft" });
    const numbers = createNumberDrafts(product);
    numbers[product.variants[0].id].price = "9999";
    expect(
      validateProductDraft(product, numbers).errors["variants.0.price"],
    ).toMatch(/MRP/);
  });
});
it("saves measured packed dimensions separately from net contents", () => {
  const product = makeProduct({ status: "draft" });
  const numbers = createNumberDrafts(product);
  Object.assign(numbers[product.variants[0].id], {
    packedWeight: "1200",
    lengthCm: "12.5",
    widthCm: "10",
    heightCm: "18",
  });
  const result = validateProductDraft(product, numbers);
  expect(result.product?.variants[0].shipping).toEqual({
    weightGrams: 1200,
    lengthCm: 12.5,
    widthCm: 10,
    heightCm: 18,
  });
  expect(result.product?.variants[0].weightGrams).toBe(1000);
});
it("gives usable inline guidance when packed values exceed carrier limits", () => {
  const product = makeProduct({ status: "draft" });
  const numbers = createNumberDrafts(product);
  Object.assign(numbers[product.variants[0].id], {
    packedWeight: "100001",
    lengthCm: "201",
    widthCm: "10",
    heightCm: "18",
  });
  const result = validateProductDraft(product, numbers);
  expect(result.errors["variants.0.shipping.weightGrams"]).toMatch(/100000/);
  expect(result.errors["variants.0.shipping.lengthCm"]).toMatch(/200/);
});
it("rejects whitespace-only option labels with a friendly inline field error", () => {
  const product = makeProduct({ status: "draft" });
  product.variants[0].label = "   ";
  const result = validateProductDraft(product, createNumberDrafts(product));
  expect(result.product).toBeUndefined();
  expect(result.errors["variants.0.label"]).toMatch(/option name/i);
});
