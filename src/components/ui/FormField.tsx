import { useId } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { AppText } from "./AppText";
import { colors, typography } from "@/theme/tokens";
export function FormField({
  label,
  error,
  hint,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const id = useId();
  const feedbackId = `${id}-feedback`;
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mineral}
        {...props}
        accessibilityHint={[props.accessibilityHint, hint, error]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? feedbackId : undefined}
        style={[
          styles.input,
          error && { borderColor: colors.danger },
          props.style,
        ]}
      />
      {hint ? (
        <AppText
          variant="caption"
          tone="muted"
          nativeID={!error ? feedbackId : undefined}
        >
          {hint}
        </AppText>
      ) : null}
      {error ? (
        <AppText
          nativeID={feedbackId}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          variant="caption"
          tone="danger"
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 12, lineHeight: 18, fontFamily: typography.bodySemibold },
  input: {
    backgroundColor: "#FFF",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 46,
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.bone,
  },
});
