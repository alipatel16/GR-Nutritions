import { useState, type PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, focus, layout, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

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
    backgroundColor: colors.transparent,
    borderColor: colors.line,
  },
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
        <ActivityIndicator color={colors.obsidian} size="small" />
      ) : null}
      <AppText
        style={variant === 'ghost' ? styles.ghostLabel : styles.solidLabel}
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
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    minHeight: layout.minimumPressTarget,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  focused: {
    borderColor: focus.color,
    borderWidth: focus.width,
  },
  disabled: {
    opacity: 0.45,
  },
  solidLabel: {
    color: '#FFFFFF',
  },
  ghostLabel: {
    color: colors.bone,
  },
});
