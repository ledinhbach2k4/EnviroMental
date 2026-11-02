import React from 'react';
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  WithSpringConfig,
} from 'react-native-reanimated';
import { animationTokens } from '../../src/design/tokens';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  scaleTo?: number;
  opacityTo?: number;
  springConfig?: WithSpringConfig;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
}

const setSharedValue = <T,>(sv: { value: T }, val: T) => {
  sv.value = val;
};

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onPressIn,
  onPressOut,
  scaleTo = animationTokens.micro.buttonPressScale,
  opacityTo = animationTokens.micro.activeOpacity,
  springConfig = animationTokens.springs.bouncy,
  style,
  disabled,
  ...rest
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;
    setSharedValue(scale, withSpring(scaleTo, springConfig));
    if (opacityTo !== undefined && opacityTo !== 1) {
      setSharedValue(
        opacity,
        withTiming(opacityTo, { duration: animationTokens.durations.instant })
      );
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    setSharedValue(scale, withSpring(1, springConfig));
    setSharedValue(opacity, withTiming(1, { duration: animationTokens.durations.fast }));
    if (disabled) return;
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableBase
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={
        typeof style === 'function'
          ? (state: PressableStateCallbackType) => [style(state), animatedStyle]
          : [style, animatedStyle]
      }
      {...rest}
    >
      {typeof children === 'function'
        ? (state: PressableStateCallbackType) => children(state)
        : children}
    </AnimatedPressableBase>
  );
};

export default AnimatedPressable;
