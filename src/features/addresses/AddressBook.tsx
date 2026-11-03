import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { MapPin, Pencil, Plus, Trash2, Check } from "lucide-react-native";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { addressFieldErrors, type FieldErrors } from "@/lib/form-errors";
import { colors } from "@/theme/tokens";
import { addressRepository } from "./address-repository";
import {
  addressSchema,
  type Address,
  type AddressInput,
} from "./address-schema";
const blank: AddressInput = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "Maharashtra",
  pincode: "",
  isDefault: false,
};
type AddressBookProps = {
  uid: string;
  onSelect?(address: Address): void;
  selectedId?: string;
};
export function AddressBook(props: AddressBookProps) {
  return <AddressBookContent key={props.uid} {...props} />;
}
function AddressBookContent({ uid, onSelect, selectedId }: AddressBookProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<AddressInput>(blank);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [defaultId, setDefaultId] = useState("");
  const [removeId, setRemoveId] = useState("");
  async function load() {
    setLoading(true);
    setLoadFailed(false);
    try {
      const a = await addressRepository.list(uid);
      setAddresses(a);
      setDefaultId(a.find((item) => item.isDefault)?.id ?? "");
      setError("");
    } catch {
      setLoadFailed(true);
      setError(
        "Could not load addresses. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    void addressRepository
      .list(uid)
      .then((a) => {
        if (active) {
          setAddresses(a);
          setDefaultId(a.find((item) => item.isDefault)?.id ?? "");
        }
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setError(
            "Could not load addresses. Please check your connection and try again.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid]);
  async function save() {
    const valid = addressSchema.safeParse(form);
    if (!valid.success) {
      setFieldErrors(addressFieldErrors(valid.error.issues));
      setError("Please review the highlighted address fields.");
      return;
    }
    setFieldErrors({});
    setError("");
    setBusy(true);
    try {
      await addressRepository.save(uid, valid.data, editing ?? undefined);
      setShow(false);
      setForm(blank);
      setEditing(null);
      await load();
    } catch {
      setError("Address could not be saved. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <View style={styles.heading}>
        <AppText variant="title">DELIVERY ADDRESSES</AppText>
        <Button
          variant="ghost"
          onPress={() => {
            setEditing(null);
            setForm(blank);
            setFieldErrors({});
            setError("");
            setShow(true);
          }}
        >
          <Plus size={14} /> Add new
        </Button>
      </View>
      {error ? (
        <AppText accessibilityRole="alert" tone="danger" variant="caption">
          {error}
        </AppText>
      ) : null}
      {loading && (
        <ActivityIndicator
          accessibilityLabel="Loading addresses"
          color={colors.violet}
        />
      )}
      {loadFailed && (
        <Button variant="ghost" disabled={loading} onPress={load}>
          Try again
        </Button>
      )}
      {addresses.map((a) => (
        <View
          key={a.id}
          style={[
            styles.address,
            selectedId === a.id && {
              borderColor: colors.violet,
              borderWidth: 2,
            },
          ]}
        >
          <View style={styles.heading}>
            <View style={styles.addressLabel}>
              <MapPin size={14} color={colors.violet} />
              <AppText variant="label">
                {a.label}
                {defaultId === a.id ? " · Default" : ""}
              </AppText>
            </View>
            <View style={{ flexDirection: "row" }}>
              <Pressable
                accessibilityLabel={`Edit ${a.label} address`}
                onPress={() => {
                  setEditing(a.id);
                  setForm(a);
                  setFieldErrors({});
                  setError("");
                  setShow(true);
                }}
                style={styles.icon}
              >
                <Pencil size={17} color={colors.mineral} />
              </Pressable>
              <Pressable
                accessibilityLabel={`Remove ${a.label} address`}
                onPress={() => setRemoveId(a.id)}
                style={styles.icon}
              >
                <Trash2 size={17} color={colors.danger} />
              </Pressable>
            </View>
          </View>
          <AppText variant="label">{a.fullName}</AppText>
          <AppText tone="muted" variant="caption">
            {a.line1}
            {a.line2 ? `, ${a.line2}` : ""}
            {"\n"}
            {a.city}, {a.state} — {a.pincode}
            {"\n"}
            {a.phone}
          </AppText>
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {onSelect && (
              <Button
                variant={selectedId === a.id ? "primary" : "ghost"}
                onPress={() => onSelect(a)}
              >
                {selectedId === a.id ? "Selected" : "Deliver here"}
              </Button>
            )}
            {defaultId !== a.id && (
              <Button
                variant="ghost"
                onPress={async () => {
                  try {
                    await addressRepository.setDefault(uid, a.id);
                    await load();
                  } catch {
                    setError("Could not change default address.");
                  }
                }}
              >
                Make default
              </Button>
            )}
          </View>
          {removeId === a.id && (
            <View style={{ gap: 10 }}>
              <AppText variant="caption">Remove this saved address?</AppText>
              <Button
                variant="ghost"
                onPress={async () => {
                  try {
                    await addressRepository.remove(uid, a.id);
                    setRemoveId("");
                    await load();
                  } catch {
                    setError("Could not remove address.");
                  }
                }}
              >
                Confirm removal
              </Button>
              <Button variant="ghost" onPress={() => setRemoveId("")}>
                Keep address
              </Button>
            </View>
          )}
        </View>
      ))}
      {!loading && !loadFailed && !addresses.length && !show && (
        <AppText tone="muted">
          Add your first address to make checkout easier.
        </AppText>
      )}
      {show && (
        <View style={styles.address}>
          <AppText variant="title">
            {editing ? "EDIT ADDRESS" : "NEW ADDRESS"}
          </AppText>
          {(
            [
              ["label", "Address label"],
              ["fullName", "Full name"],
              ["phone", "Mobile number"],
              ["line1", "House, building and street"],
              ["line2", "Area / landmark (optional)"],
              ["city", "City"],
              ["state", "State / union territory"],
              ["pincode", "Pincode"],
            ] as const
          ).map(([key, label]) => (
            <FormField
              key={key}
              label={label}
              value={String(form[key] ?? "")}
              error={fieldErrors[key]}
              editable={!busy}
              onChangeText={(value) => {
                setForm((f) => ({ ...f, [key]: value }));
                setFieldErrors((errors) => ({ ...errors, [key]: "" }));
              }}
              keyboardType={
                key === "phone" || key === "pincode" ? "number-pad" : "default"
              }
              autoComplete={key === "phone" ? "tel" : "off"}
            />
          ))}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.isDefault }}
            onPress={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
            style={styles.addressLabel}
          >
            <Check
              size={18}
              color={form.isDefault ? colors.violet : colors.line}
            />
            <AppText variant="caption">Use as default address</AppText>
          </Pressable>
          <Button loading={busy} onPress={save}>
            Save address
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setShow(false);
              setFieldErrors({});
              setError("");
            }}
          >
            Cancel
          </Button>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  address: {
    backgroundColor: "#FFF",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 10,
    padding: 20,
    gap: 14,
  },
  addressLabel: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    minHeight: 40,
  },
  icon: { padding: 10, minHeight: 44, minWidth: 40 },
});
