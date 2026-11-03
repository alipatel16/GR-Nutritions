import { productSchema } from "@/features/catalog/schema";
import type { Product } from "@/features/catalog/types";
import type { FieldErrors } from "@/lib/form-errors";

export const editorSections = [
  { id: "basics", label: "Basics" },
  { id: "images", label: "Images" },
  { id: "variants", label: "Variants & shipping" },
  { id: "label", label: "Label information" },
  { id: "publish", label: "Publish" },
] as const;
export type EditorSection = (typeof editorSections)[number]["id"];
export type NumberDraft = {
  price: string;
  mrp: string;
  weightGrams: string;
  stockAvailable: string;
  packedWeight: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
};
export type NumberDrafts = Record<string, NumberDraft>;

export function createNumberDrafts(product: Product): NumberDrafts {
  return Object.fromEntries(
    product.variants.map((v) => [
      v.id,
      {
        price: String(v.price.amountPaise / 100),
        mrp: String(v.mrp.amountPaise / 100),
        weightGrams: String(v.weightGrams),
        stockAvailable: String(v.stockAvailable),
        packedWeight: v.shipping ? String(v.shipping.weightGrams) : "",
        lengthCm: v.shipping ? String(v.shipping.lengthCm) : "",
        widthCm: v.shipping ? String(v.shipping.widthCm) : "",
        heightCm: v.shipping ? String(v.shipping.heightCm) : "",
      },
    ]),
  );
}
export function parseRupees(input: string): number | null {
  const value = input.trim();
  if (!/^\d+(?:\.\d{0,2})?$/.test(value)) return null;
  const [rupees, paise = ""] = value.split(".");
  const amount = Number(rupees) * 100 + Number(paise.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}
export function sectionForField(field: string): EditorSection {
  if (field.startsWith("variants")) return "variants";
  if (field.startsWith("media")) return "images";
  if (
    ["usage", "warnings", "ingredients", "dietaryTags"].some((key) =>
      field.startsWith(key),
    )
  )
    return "label";
  if (["status", "featuredRank", "demoContent"].includes(field))
    return "publish";
  return "basics";
}
const labels: FieldErrors = {
  name: "Product name",
  brand: "Brand",
  slug: "Product URL",
  summary: "Short description",
  description: "Full description",
  usage: "How to use",
  warnings: "Warnings",
  ingredients: "Ingredients",
  media: "Product images",
  variants: "Product options",
  sku: "SKU",
  label: "Option name",
  flavour: "Flavour",
  size: "Pack size",
  weightGrams: "Net weight (g)",
  stockAvailable: "Available stock",
  price: "Selling price",
  mrp: "MRP",
  alt: "Image description",
  featuredRank: "Display priority",
};
function positiveNumber(input: string, integer = false): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(input.trim())) return null;
  const value = Number(input);
  return Number.isFinite(value) &&
    value > 0 &&
    (!integer || Number.isSafeInteger(value))
    ? value
    : null;
}
export function validateProductDraft(
  product: Product,
  numbers: NumberDrafts,
): { product?: Product; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const variants = product.variants.map((variant, i) => {
    const draft = numbers[variant.id];
    const prefix = `variants.${i}`;
    const price = parseRupees(draft.price);
    const mrp = parseRupees(draft.mrp);
    if (price === null || price <= 0)
      errors[`${prefix}.price`] =
        "Enter a selling price greater than zero, with up to 2 decimal places.";
    if (mrp === null || mrp <= 0)
      errors[`${prefix}.mrp`] =
        "Enter an MRP greater than zero, with up to 2 decimal places.";
    if (price !== null && mrp !== null && price > mrp)
      errors[`${prefix}.price`] = "Selling price must be no higher than MRP.";
    const net = positiveNumber(draft.weightGrams, true);
    if (net === null)
      errors[`${prefix}.weightGrams`] =
        "Enter the net weight in whole grams, greater than zero.";
    const stock = /^\d+$/.test(draft.stockAvailable.trim())
      ? Number(draft.stockAvailable)
      : NaN;
    if (!Number.isSafeInteger(stock))
      errors[`${prefix}.stockAvailable`] =
        "Enter available stock as a whole number, zero or more.";
    const shippingFields = [
      ["packedWeight", "weightGrams", "packed weight in whole grams", true],
      ["lengthCm", "lengthCm", "package length in centimetres", false],
      ["widthCm", "widthCm", "package width in centimetres", false],
      ["heightCm", "heightCm", "package height in centimetres", false],
    ] as const;
    let shipping = variant.shipping;
    if (shippingFields.some(([field]) => draft[field].trim())) {
      const packed: Record<string, number> = {};
      for (const [field, key, label, integer] of shippingFields) {
        const value = positiveNumber(draft[field], integer);
        if (value === null)
          errors[`${prefix}.shipping.${key}`] =
            `Enter ${label}, greater than zero.`;
        else if (!integer && value <= 0.5)
          errors[`${prefix}.shipping.${key}`] = `Enter ${label}, greater than 0.5.`;
        else if (value > (integer ? 100000 : 200))
          errors[`${prefix}.shipping.${key}`] =
            `Enter ${label}, no more than ${integer ? "100000" : "200"}.`;
        else packed[key] = value;
      }
      shipping = packed as NonNullable<typeof shipping>;
    } else if (variant.shipping) shipping = undefined;
    const updated = {
      ...variant,
      sku: variant.sku.trim(),
      label: variant.label.trim(),
      flavour: variant.flavour.trim(),
      size: variant.size.trim(),
      price: { ...variant.price, amountPaise: price ?? 0 },
      mrp: { ...variant.mrp, amountPaise: mrp ?? 0 },
      weightGrams: net ?? 0,
      stockAvailable: stock,
    };
    if (shipping) return { ...updated, shipping };
    const { shipping: removed, ...withoutShipping } = updated;
    return withoutShipping;
  });
  const trimmed = {
    ...product,
    name: product.name.trim(),
    brand: product.brand.trim(),
    slug: product.slug.trim(),
    summary: product.summary.trim(),
    description: product.description.trim(),
    usage: product.usage.trim(),
    variants,
    media: product.media.map((image) => ({ ...image, alt: image.alt.trim() })),
  };
  const checked = productSchema.safeParse(trimmed);
  if (!checked.success)
    for (const issue of checked.error.issues) {
      let path = issue.path.join(".");
      const field = String(issue.path[issue.path.length - 1]);
      if (field === "amountPaise") path = issue.path.slice(0, -1).join(".");
      if (issue.path[0] === "warnings" || issue.path[0] === "ingredients")
        path = String(issue.path[0]);
      if (!errors[path])
        errors[path] =
          `Please check ${labels[field]?.toLowerCase() ?? labels[String(issue.path[0])]?.toLowerCase() ?? "this field"}.`;
    }
  return Object.keys(errors).length || !checked.success
    ? { errors }
    : { product: checked.data, errors };
}
