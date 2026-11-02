import React, { useEffect, useContext } from 'react';
import { StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { animationTokens } from '../../src/design/tokens';
import { DesignSystemContext } from '../../src/design';

export interface PulseSkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  minOpacity?: number;
  maxOpacity?: number;
  duration?: number;
  backgroundColor?: string;
  children?: React.ReactNode;
  testID?: string;
}

export const PulseSkeleton: React.FC<PulseSkeletonProps> = ({
  width,
  height,
  borderRadius = 6,
  style,
  minOpacity = animationTokens.skeleton.minOpacity,
  maxOpacity = animationTokens.skeleton.maxOpacity,
  duration = animationTokens.skeleton.pulseDuration,
  backgroundColor,
  children,
  testID,
}) => {
  // Use design system colors if available, otherwise fallback safely
  const dsContext = useContext(DesignSystemContext);
  const fallbackBg = dsContext?.tokens?.colors?.borderLight ?? '#E2E8F0';

  const opacity = useSharedValue(minOpacity);

  useEffect(() => {
    opacity.value = minOpacity;
    opacity.value = withRepeat(
      withTiming(maxOpacity, {
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [minOpacity, maxOpacity, duration, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: backgroundColor ?? fallbackBg,
        } as any,
        style as any,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default PulseSkeleton;
