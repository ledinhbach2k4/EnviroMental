import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import {
  useDesignSystem,
  useColors,
  useTypography,
  useSpacing,
  useRadii,
} from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';

export interface MoodBarItemProps {
  emoji: string;
  label?: string;
  count: number;
  targetHeight: number;
  color: string;
  isMostFrequent?: boolean;
  springConfig?: WithSpringConfig;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Mood distribution bar item with pure Reanimated physics-based spring animation.
 * Clamps target height strictly between [5%, 80%] to preserve the Apple HIG
 * label headspace invariant, wrapped in a rounded rail track.
 */
export function MoodBarItem({
  emoji,
  label,
  count,
  targetHeight,
  color,
  isMostFrequent = false,
  springConfig = animationTokens.springs.gentle,
  borderRadius,
  style,
  testID,
}: MoodBarItemProps) {
  const { theme } = useDesignSystem();
  const isDark = theme.isDark;
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();

  // Enforce mathematical bounds: strictly clamped between 5% and 80%
  const clampedHeight = Math.min(Math.max(targetHeight, 5), 80);

  const heightAnim = useSharedValue(5);

  useEffect(() => {
    heightAnim.value = withSpring(clampedHeight, springConfig ?? animationTokens.springs.gentle);
  }, [clampedHeight, springConfig, heightAnim]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    height: `${heightAnim.value}%`,
  }));

  const trackRadius = borderRadius ?? radii.full;
  const trackBg = isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceAlt;
  const trackBorder = isDark ? 'rgba(255, 255, 255, 0.06)' : colors.borderLight;

  return (
    <View style={[styles.column, style]} testID={testID}>
      {/* Count label container */}
      <View style={styles.countContainer}>
        {count > 0 ? (
          <Text
            style={[
              typography.captionSmall,
              styles.countText,
              {
                color: isMostFrequent ? color : colors.textMuted,
                fontWeight: isMostFrequent ? '700' : '500',
              },
            ]}
          >
            {count}
          </Text>
        ) : null}
      </View>

      {/* Rail track */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: trackBg,
            borderColor: trackBorder,
            borderRadius: trackRadius,
            marginBottom: spacing.xs,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.bar,
            {
              backgroundColor: color,
              borderRadius: trackRadius,
            },
            animatedBarStyle,
          ]}
        />
      </View>

      {/* Emoji descriptor */}
      <Text style={styles.emojiText} accessibilityLabel={label ?? emoji}>
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  countContainer: {
    height: 18,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  countText: {
    fontSize: 11,
    textAlign: 'center',
  },
  track: {
    flex: 1,
    width: 28,
    minHeight: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    width: '100%',
    minHeight: 4,
  },
  emojiText: {
    fontSize: 22,
    textAlign: 'center',
  },
});

export default MoodBarItem;
