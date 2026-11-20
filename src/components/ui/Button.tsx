import React from 'react';
import {
  Pressable,
  PressableProps,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Insets,
} from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'default' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  hitSlop?: Insets | number;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
  hitSlop,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  ...rest
}) => {
  const isInteractive = !disabled && !loading;

  // Ensure minimum 48px touch target for small buttons via hitSlop
  const resolvedHitSlop =
    hitSlop ?? (size === 'sm' ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined);

  return (
    <Pressable
      disabled={!isInteractive}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      hitSlop={resolvedHitSlop}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant].container,
        pressed && isInteractive && variantStyles[variant].pressed,
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          testID="button-loading-indicator"
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : colors.sky[500]}
        />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
          <Text
            allowFontScaling
            style={[
              styles.textBase,
              sizeTextStyles[size],
              variantStyles[variant].text,
              disabled && styles.disabledText,
            ]}
          >
            {children}
          </Text>
          {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
};

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.minTapTarget,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  disabledText: {
    opacity: 0.8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconContainer: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
  },
  textBase: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontWeight: '600',
    textAlign: 'center',
  },
});

const sizeStyles = StyleSheet.create({
  sm: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  default: {
    minHeight: spacing.minTapTarget,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
});

const sizeTextStyles = StyleSheet.create({
  sm: {
    fontSize: 13,
    lineHeight: 18,
  },
  default: {
    fontSize: 15,
    lineHeight: 20,
  },
  lg: {
    fontSize: 17,
    lineHeight: 22,
  },
});

const variantStyles = {
  primary: {
    container: {
      backgroundColor: colors.sky[500],
      borderWidth: 0,
    },
    pressed: {
      backgroundColor: colors.sky[700],
    },
    text: {
      color: '#FFFFFF',
    },
  },
  secondary: {
    container: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    pressed: {
      backgroundColor: colors.sky[50],
      borderColor: colors.sky[200],
    },
    text: {
      color: colors.ink.DEFAULT,
    },
  },
  outline: {
    container: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    pressed: {
      backgroundColor: colors.surface,
      borderColor: colors.hairline,
    },
    text: {
      color: colors.ink.DEFAULT,
    },
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    pressed: {
      backgroundColor: colors.surface,
    },
    text: {
      color: colors.sky[700],
    },
  },
  danger: {
    container: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.status.broken,
    },
    pressed: {
      backgroundColor: colors.surface,
    },
    text: {
      color: colors.status.broken,
    },
  },
};

export default Button;
