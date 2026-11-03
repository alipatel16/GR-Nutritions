import { useState } from "react";
import { Image } from "expo-image";
import { randomUUID } from "expo-crypto";
import { View } from "react-native";
import { Upload } from "lucide-react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { colors } from "@/theme/tokens";
import {
  dietaryTagValues,
  productCategoryValues,
  productGoalValues,
  type Product,
} from "@/features/catalog/types";
import type { FieldErrors } from "@/lib/form-errors";
import {
  createNumberDrafts,
  editorSections,
  sectionForField,
  validateProductDraft,
  type EditorSection,
  type NumberDraft,
} from "./product-editor";

export function ProductEditor({
  product,
  onChange,
  onSave,
  onUpload,
  onClose,
  onSectionChange,
  busy,
}: {
  product: Product;
  onChange(product: Product): void;
  onSave(product: Product): void;
  onUpload(): void;
  onClose(): void;
  onSectionChange?(): void;
  busy: boolean;
}) {
  const [section, setSection] = useState<EditorSection>("basics");
  const [numbers, setNumbers] = useState(() => createNumberDrafts(product));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [ingredients, setIngredients] = useState(
    product.ingredients.map((x) => x.name).join("\n"),
  );
  const [warnings, setWarnings] = useState(product.warnings.join("\n"));
  const [labelsEdited, setLabelsEdited] = useState({
    ingredients: false,
    warnings: false,
  });
  const index = editorSections.findIndex((s) => s.id === section);
  function save() {
    const draft = {
      ...product,
      ingredients: labelsEdited.ingredients
        ? ingredients
            .split("\n")
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => ({ name }))
        : product.ingredients,
      warnings: labelsEdited.warnings
        ? warnings
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean)
        : product.warnings,
    };
    const checked = validateProductDraft(draft, numbers);
    setErrors(checked.errors);
    if (!checked.product) {
      setSection(sectionForField(Object.keys(checked.errors)[0]));
      onSectionChange?.();
      return;
    }
    onSave(checked.product);
  }
  function textField(
    key: "name" | "brand" | "slug" | "summary" | "description" | "usage",
    label: string,
    multiline = false,
  ) {
    return (
      <FormField
        key={key}
        label={label}
        value={product[key]}
        multiline={multiline}
        error={errors[key]}
        editable={!busy}
        onChangeText={(value) => onChange({ ...product, [key]: value })}
      />
    );
  }
  return (
    <View
      style={{
        backgroundColor: "#FFF",
        padding: 24,
        borderRadius: 12,
        gap: 18,
      }}
    >
      <AppText variant="heading">PRODUCT EDITOR</AppText>
      <AppText tone="muted" variant="caption">
        Step {index + 1} of {editorSections.length} · Your changes stay here as
        you move between sections.
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {editorSections.map((item) => (
          <Button
            key={item.id}
            accessibilityState={{ selected: section === item.id }}
            variant={section === item.id ? "primary" : "ghost"}
            disabled={busy}
            onPress={() => { setSection(item.id); onSectionChange?.(); }}
          >
            {item.label}
          </Button>
        ))}
      </View>
      {Object.keys(errors).length > 0 && (
        <View
          style={{
            backgroundColor: colors.dangerSoft,
            borderRadius: 8,
            padding: 14,
            gap: 8,
          }}
        >
          <AppText accessibilityRole="alert" tone="danger">
            Please review the highlighted fields before saving.
          </AppText>
          {editorSections
            .filter((s) =>
              Object.keys(errors).some(
                (field) => sectionForField(field) === s.id,
              ),
            )
            .map((s) => (
              <Button
                key={s.id}
                variant="ghost"
                onPress={() => { setSection(s.id); onSectionChange?.(); }}
              >
                Review {s.label.toLowerCase()}
              </Button>
            ))}
        </View>
      )}
      {section === "basics" && (
        <View style={{ gap: 16 }}>
          {textField("name", "Product name")}
          {textField("brand", "Brand")}
          {textField("slug", "Product URL")}
          {textField("summary", "Short description", true)}
          {textField("description", "Full description", true)}
          <AppText variant="label">Category</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {productCategoryValues.map((value) => (
              <Button
                key={value}
                variant={product.category === value ? "primary" : "ghost"}
                onPress={() => onChange({ ...product, category: value })}
              >
                {value.replaceAll("-", " ")}
              </Button>
            ))}
          </View>
          <AppText variant="label">Goals</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {productGoalValues.map((value) => (
              <Button
                key={value}
                variant={product.goals.includes(value) ? "primary" : "ghost"}
                onPress={() =>
                  onChange({
                    ...product,
                    goals: product.goals.includes(value)
                      ? product.goals.filter((g) => g !== value)
                      : [...product.goals, value],
                  })
                }
              >
                {value.replaceAll("-", " ")}
              </Button>
            ))}
          </View>
        </View>
      )}
      {section === "images" && (
        <View style={{ gap: 16 }}>
          <AppText variant="title">PRODUCT IMAGES</AppText>
          <AppText tone="muted" variant="caption">
            The first image appears on product cards. Choose JPEG, PNG or WebP
            files up to 6 MB.
          </AppText>
          <Button variant="ghost" loading={busy} onPress={onUpload}>
            <Upload size={16} /> Upload product image
          </Button>
          {!product.media.length && (
            <AppText tone="muted">
              No images yet. Upload a clear product photo.
            </AppText>
          )}
          {errors.media && <AppText tone="danger">{errors.media}</AppText>}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {product.media.map((media, i) => (
              <View key={media.id} style={{ width: 220, gap: 10 }}>
                <Image
                  source={{ uri: media.uri }}
                  accessibilityLabel={media.alt}
                  style={{ width: 220, height: 160, borderRadius: 8 }}
                  contentFit="contain"
                />
                <FormField
                  label={`Image ${i + 1} description`}
                  hint="Describe the product or label shown in this image."
                  value={media.alt}
                  error={errors[`media.${i}.alt`]}
                  onChangeText={(alt) =>
                    onChange({
                      ...product,
                      media: product.media.map((m, j) =>
                        j === i ? { ...m, alt } : m,
                      ),
                    })
                  }
                />
                <Button
                  variant="ghost"
                  disabled={busy}
                  onPress={() =>
                    onChange({
                      ...product,
                      media: product.media
                        .filter((m) => m.id !== media.id)
                        .map((m, j) => ({ ...m, sortOrder: j })),
                    })
                  }
                >
                  Remove image
                </Button>
                {i > 0 && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onPress={() => {
                      const images = [...product.media];
                      [images[i - 1], images[i]] = [images[i], images[i - 1]];
                      onChange({
                        ...product,
                        media: images.map((m, j) => ({ ...m, sortOrder: j })),
                      });
                    }}
                  >
                    Move earlier
                  </Button>
                )}
              </View>
            ))}
          </View>
        </View>
      )}
      {section === "variants" && (
        <View style={{ gap: 16 }}>
          <AppText variant="title">VARIANTS & SHIPPING</AppText>
          <AppText tone="muted" variant="caption">
            Net weight is the product content. Packed weight and dimensions
            include the delivery packaging. Enter measured values so delivery
            can be quoted.
          </AppText>
          {product.variants.map((variant, i) => (
            <View
              key={variant.id}
              style={{
                borderColor: colors.line,
                borderWidth: 1,
                padding: 18,
                borderRadius: 8,
                gap: 12,
              }}
            >
              <AppText variant="label">
                Option {i + 1}
                {variant.isDefault ? " · Default" : ""}
              </AppText>
              {(
                [
                  ["sku", "SKU"],
                  ["label", "Option name"],
                  ["flavour", "Flavour"],
                  ["size", "Pack size"],
                ] as const
              ).map(([key, label]) => (
                <FormField
                  key={key}
                  label={label}
                  value={variant[key]}
                  error={errors[`variants.${i}.${key}`]}
                  editable={!busy}
                  onChangeText={(value) =>
                    onChange({
                      ...product,
                      variants: product.variants.map((v) =>
                        v.id === variant.id ? { ...v, [key]: value } : v,
                      ),
                    })
                  }
                />
              ))}
              {(
                [
                  ["price", "Selling price (₹)"],
                  ["mrp", "MRP (₹)"],
                  ["weightGrams", "Net weight (g)"],
                  ["stockAvailable", "Available stock"],
                  ["packedWeight", "Packed weight (g)"],
                  ["lengthCm", "Package length (cm)"],
                  ["widthCm", "Package width (cm)"],
                  ["heightCm", "Package height (cm)"],
                ] as const
              ).map(([key, label]) => {
                const path = [
                  "packedWeight",
                  "lengthCm",
                  "widthCm",
                  "heightCm",
                ].includes(key)
                  ? `shipping.${key === "packedWeight" ? "weightGrams" : key}`
                  : key;
                return (
                  <FormField
                    key={key}
                    label={label}
                    value={numbers[variant.id]?.[key] ?? ""}
                    keyboardType={
                      [
                        "stockAvailable",
                        "weightGrams",
                        "packedWeight",
                      ].includes(key)
                        ? "number-pad"
                        : "decimal-pad"
                    }
                    editable={!busy}
                    error={errors[`variants.${i}.${path}`]}
                    onChangeText={(value) =>
                      setNumbers((current) => ({
                        ...current,
                        [variant.id]: { ...current[variant.id], [key]: value },
                      }))
                    }
                  />
                );
              })}
              {!variant.shipping && !numbers[variant.id]?.packedWeight && (
                <AppText tone="muted" variant="caption">
                  Shipping measurements are missing. This option cannot be
                  checked out until packed measurements are added.
                </AppText>
              )}
              {product.variants.length > 1 && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onPress={() =>
                    onChange({
                      ...product,
                      variants: product.variants
                        .filter((v) => v.id !== variant.id)
                        .map((v, j) => ({
                          ...v,
                          isDefault: variant.isDefault ? j === 0 : v.isDefault,
                        })),
                    })
                  }
                >
                  Remove option {i + 1}
                </Button>
              )}
            </View>
          ))}
          <Button
            variant="ghost"
            disabled={busy}
            onPress={() => {
              const variant = {
                id: randomUUID(),
                sku: "",
                label: "",
                flavour: "",
                size: "",
                weightGrams: 0,
                price: { amountPaise: 0, currency: "INR" as const },
                mrp: { amountPaise: 0, currency: "INR" as const },
                stockAvailable: 0,
                isDefault: false,
              };
              const added = {
                ...product,
                variants: [...product.variants, variant],
              };
              const numberDraft = createNumberDrafts(added)[variant.id];
              setNumbers((current) => ({
                ...current,
                [variant.id]: {
                  ...numberDraft,
                  weightGrams: "",
                  price: "",
                  mrp: "",
                } as NumberDraft,
              }));
              onChange(added);
            }}
          >
            Add flavour / size option
          </Button>
        </View>
      )}
      {section === "label" && (
        <View style={{ gap: 16 }}>
          <AppText variant="title">LABEL INFORMATION</AppText>
          {textField("usage", "How to use", true)}
          <FormField
            label="Ingredients (one per line)"
            multiline
            value={ingredients}
            error={errors.ingredients}
            onChangeText={(value) => {
              setIngredients(value);
              setLabelsEdited((state) => ({ ...state, ingredients: true }));
            }}
          />
          <FormField
            label="Warnings (one per line)"
            multiline
            value={warnings}
            error={errors.warnings}
            onChangeText={(value) => {
              setWarnings(value);
              setLabelsEdited((state) => ({ ...state, warnings: true }));
            }}
          />
          <AppText variant="label">Reviewed dietary labels</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {dietaryTagValues.map((value) => (
              <Button
                key={value}
                variant={
                  product.dietaryTags.includes(value) ? "primary" : "ghost"
                }
                onPress={() =>
                  onChange({
                    ...product,
                    dietaryTags: product.dietaryTags.includes(value)
                      ? product.dietaryTags.filter((tag) => tag !== value)
                      : [...product.dietaryTags, value],
                  })
                }
              >
                {value.replaceAll("-", " ")}
              </Button>
            ))}
          </View>
        </View>
      )}
      {section === "publish" && (
        <View style={{ gap: 16 }}>
          <AppText variant="title">REVIEW & PUBLISH</AppText>
          <AppText>
            {product.name || "Untitled product"} · {product.variants.length}{" "}
            options · {product.media.length} images
          </AppText>
          <AppText tone="muted">
            Draft products stay hidden. Active products appear in your
            storefront. Archived products stay hidden from shoppers.
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["draft", "active", "archived"] as const).map((status) => (
              <Button
                key={status}
                variant={product.status === status ? "primary" : "ghost"}
                onPress={() => onChange({ ...product, status })}
              >
                {status[0].toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </View>
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          borderTopWidth: 1,
          borderColor: colors.line,
          paddingTop: 16,
        }}
      >
        {index > 0 && (
          <Button
            variant="ghost"
            disabled={busy}
            onPress={() => setSection(editorSections[index - 1].id)}
          >
            Previous
          </Button>
        )}
        {index < editorSections.length - 1 && (
          <Button
            disabled={busy}
            onPress={() => setSection(editorSections[index + 1].id)}
          >
            Continue
          </Button>
        )}
        <Button loading={busy} onPress={save}>
          Save product
        </Button>
        <Button variant="ghost" disabled={busy} onPress={onClose}>
          Close editor
        </Button>
      </View>
    </View>
  );
}
