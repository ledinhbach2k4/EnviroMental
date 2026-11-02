import React from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { AnimatedPressable } from './motion';
import { animationTokens } from '@/src/design/tokens';

export interface ButtonProps {
  text: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'outline' | 'accent' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accessibilityLabel?: string;
  testID?: string;
}

export default function Button({
  text,
  onPress,
  style,
  textStyle,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  leftIcon,
  rightIcon,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const styles = StyleSheet.create({
    base: {
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.sm,
      ...shadows.sm,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    secondary: {
      backgroundColor: colors.secondary,
    },
    accent: {
      backgroundColor: colors.accent,
    },
    danger: {
      backgroundColor: colors.danger,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    small: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.md,
    },
    medium: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    large: {
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxl,
      borderRadius: radii.xl,
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      ...typography.button,
      color: colors.textInverse,
    },
    textOutline: {
      ...typography.button,
      color: colors.primary,
    },
    textGhost: {
      ...typography.button,
      color: colors.primary,
    },
  });

  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    variant === 'outline'
      ? styles.textOutline
      : variant === 'ghost'
        ? styles.textGhost
        : styles.text,
    textStyle,
  ];

  return (
    <AnimatedPressable
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
      scaleTo={animationTokens.micro.buttonPressScale}
      opacityTo={animationTokens.micro.activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      {leftIcon}
      <Text style={textStyles}>{text}</Text>
      {rightIcon}
    </AnimatedPressable>
  );
}
