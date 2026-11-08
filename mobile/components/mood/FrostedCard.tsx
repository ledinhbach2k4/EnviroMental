import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useColors, useRadii, useSpacing } from '@/src/design/hooks';

export interface FrostedCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  isDark?: boolean;
  borderRadius?: number;
  testID?: string;
}

/**
 * Clean, flat surface card component adhering to the global design system.
 * Uses colors.surface, colors.borderLight, standard radii, and flat design (no blur/heavy shadows).
 */
export function FrostedCard({
  children,
  style,
  contentStyle,
  borderRadius,
  testID,
}: FrostedCardProps) {
  const colors = useColors();
  const radii = useRadii();
  const spacing = useSpacing();

  const cardRadius = borderRadius ?? radii.xl;

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          borderRadius: cardRadius,
          padding: spacing.lg,
        },
        style,
        contentStyle,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});

export default FrostedCard;
