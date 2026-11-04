import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { AppText } from "@/components/ui/AppText";
import { colors } from "@/theme/tokens";

export function AdminSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor={colors.mineral}
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      autoCorrect={false}
      style={styles.search}
    />
  );
}

export function AdminSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange(value: string): void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.select}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${options.find((option) => option.value === value)?.label ?? value}`}
        accessibilityState={{ expanded: open }}
        style={styles.trigger}
        onPress={() => setOpen(!open)}
      >
        <AppText variant="caption">
          {label} ·{" "}
          {options.find((option) => option.value === value)?.label ?? value} ▾
        </AppText>
      </Pressable>
      {open && (
        <ScrollView style={styles.options} nestedScrollEnabled>
          {options.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === value }}
              style={styles.trigger}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <AppText variant="caption">{option.label}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: "#FFF",
    color: colors.ink,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    minHeight: 48,
  },
  select: { minWidth: 160, flexGrow: 1, flexBasis: 180 },
  trigger: {
    backgroundColor: "#FFF",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  options: { maxHeight: 220, marginTop: 4 },
});
