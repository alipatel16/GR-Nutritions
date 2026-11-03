import { useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, focus, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse';

type ButtonProps = PropsWithChildren<
  Omit<PressableProps, 'children' | 'style'> & {
    variant?: ButtonVariant;
    loading?: boolean;
    style?: StyleProp<ViewStyle>;
  }
>;

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  secondary: {
    backgroundColor: colors.bone,
    borderColor: colors.bone,
  },
  ghost: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
  },
  inverse: {
    backgroundColor: colors.transparent,
    borderColor: colors.graphiteLine,
  },
};

const labelColors: Record<ButtonVariant, string> = {
  primary: colors.graphite,
  secondary: colors.onDark,
  ghost: colors.ink,
  inverse: colors.onDark,
};

export function Button({
  children,
  disabled = false,
  loading = false,
  onBlur,
  onFocus,
  style,
  variant = 'primary',
  ...props
}: ButtonProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...props.accessibilityState, busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isFocused ? styles.focused : undefined,
        pressed && !isDisabled ? styles.pressed : undefined,
        isDisabled ? styles.disabled : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColors[variant]} size="small" />
      ) : null}
      <AppText
        style={[styles.label, { color: labelColors[variant] }]}
        variant="label"
      >
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.xs,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  focused: {
    borderColor: focus.color,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    letterSpacing: 0.3,
  },
});
