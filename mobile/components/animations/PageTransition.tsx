import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { animationTokens } from '@/src/design/tokens';

export interface PageTransitionProps {
  children: React.ReactNode;
  duration?: number;
  offsetY?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  duration = animationTokens.durations.fast,
  offsetY = 8,
  delay = 0,
  style,
}) => {
  const pathname = usePathname();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.bezier(0.2, 0.0, 0.0, 1.0),
      })
    );
  }, [pathname, duration, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + progress.value * 0.15,
    transform: [{ translateY: offsetY * (1 - progress.value) }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle, style as any]}>{children}</Animated.View>
  );
};

export default PageTransition;
