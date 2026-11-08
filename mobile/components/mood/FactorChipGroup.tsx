import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { WithSpringConfig } from 'react-native-reanimated';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import {
  useDesignSystem,
  useColors,
  useTypography,
  useSpacing,
  useRadii,
} from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';

export const MOOD_FACTORS = [
  'Weather',
  'Sleep',
  'Work',
  'Exercise',
  'Social',
  'Food',
  'Stress',
  'Health',
] as const;

export interface FactorChipGroupProps {
  selectedFactors: string[];
  onToggleFactor: (factor: string) => void;
  scaleTo?: number;
  springConfig?: WithSpringConfig;
  disabled?: boolean;
  factors?: readonly string[] | string[];
  title?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * 8 interactive factor pills with bouncy spring physics,
 * Apple HIG capsule styling, subtle border, and active tint highlight.
 */
export function FactorChipGroup({
  selectedFactors,
  onToggleFactor,
  scaleTo = 0.92,
  springConfig = animationTokens.springs.bouncy,
  disabled = false,
  factors = MOOD_FACTORS,
  title = "What's affecting your mood?",
  style,
  testID,
}: FactorChipGroupProps) {
  const { theme } = useDesignSystem();
  const isDark = theme.isDark;
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();

  const unselectedBg = isDark ? 'rgba(255, 255, 255, 0.06)' : colors.surfaceAlt;
  const unselectedBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border;

  return (
    <View style={[styles.container, style]} testID={testID}>
      {title ? (
        <Text
          style={[typography.body, styles.title, { color: colors.text, marginBottom: spacing.sm }]}
        >
          {title}
        </Text>
      ) : null}
      <View style={styles.chipsContainer}>
        {factors.map((factor) => {
          const isSelected = selectedFactors.includes(factor);
          return (
            <AnimatedPressable
              key={factor}
              scaleTo={scaleTo ?? 0.92}
              springConfig={springConfig ?? animationTokens.springs.bouncy}
              onPress={() => onToggleFactor(factor)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={factor}
              accessibilityState={{ selected: isSelected, disabled }}
              style={[
                styles.chip,
                {
                  borderRadius: radii.full,
                  backgroundColor: isSelected ? `${colors.primary}20` : unselectedBg,
                  borderColor: isSelected ? colors.primary : unselectedBorder,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  styles.chipText,
                  {
                    color: isSelected ? colors.primary : colors.textSecondary,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
              >
                {factor}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontWeight: '500',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
  },
});

export default FactorChipGroup;
