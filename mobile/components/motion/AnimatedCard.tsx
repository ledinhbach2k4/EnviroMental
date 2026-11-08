import React from 'react';
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  ViewStyle,
  ViewProps,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  WithSpringConfig,
  AnimatedProps,
} from 'react-native-reanimated';
import { animationTokens } from '../../src/design/tokens';

const AnimatedPressableCard = Animated.createAnimatedComponent(Pressable);

export interface AnimatedCardProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: React.ReactNode | ((state: PressableStateCallbackType) => React.ReactNode);
  style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  index?: number;
  scaleTo?: number;
  opacityTo?: number;
  springConfig?: WithSpringConfig;
  entering?: AnimatedProps<ViewProps>['entering'] | false | null;
  exiting?: AnimatedProps<ViewProps>['exiting'];
  layout?: AnimatedProps<ViewProps>['layout'];
  disabled?: boolean;
}

const setSharedValue = <T,>(sv: { value: T }, val: T) => {
  sv.value = val;
};

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  onPressIn,
  onPressOut,
  index,
  scaleTo = animationTokens.micro.cardPressScale,
  opacityTo = animationTokens.micro.activeOpacity,
  springConfig = animationTokens.springs.gentle,
  entering,
  exiting,
  layout,
  style,
  disabled,
  ...rest
}) => {
  const isInteractive = Boolean(onPress || rest.onLongPress);

  // Shared values for press micro-interaction
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    if (!isInteractive) return {};
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

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

  // Determine entrance animation
  let resolvedEntering: AnimatedProps<ViewProps>['entering'] = undefined;
  if (entering === false || entering === null) {
    resolvedEntering = undefined;
  } else if (entering !== undefined) {
    resolvedEntering = entering;
  } else if (index !== undefined) {
    const delay = Math.min(
      index * animationTokens.stagger.normal,
      animationTokens.stagger.maxDelay
    );
    resolvedEntering = FadeInDown.delay(delay)
      .duration(animationTokens.durations.normal)
      .springify()
      .damping(20)
      .stiffness(150);
  }

  if (isInteractive) {
    return (
      <AnimatedPressableCard
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        entering={resolvedEntering}
        exiting={exiting}
        layout={layout}
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
      </AnimatedPressableCard>
    );
  }

  const defaultState: PressableStateCallbackType = { pressed: false, hovered: false };
  const staticStyle = typeof style === 'function' ? style(defaultState) : style;
  const { testID, accessible, accessibilityRole, accessibilityLabel, ...viewProps } = rest;

  return (
    <Animated.View
      entering={resolvedEntering}
      exiting={exiting}
      layout={layout}
      style={staticStyle as any}
      testID={testID}
      accessible={accessible}
      accessibilityRole={accessibilityRole as any}
      accessibilityLabel={accessibilityLabel}
      {...(viewProps as any)}
    >
      {typeof children === 'function' ? children(defaultState) : children}
    </Animated.View>
  );
};

export default AnimatedCard;
