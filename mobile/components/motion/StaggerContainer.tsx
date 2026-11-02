import React from 'react';
import { StyleProp, ViewStyle, ViewProps } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInLeft,
  FadeInRight,
  FadeIn,
  FadeOut,
  LinearTransition,
  AnimatedProps,
} from 'react-native-reanimated';
import { animationTokens } from '../../src/design/tokens';

export interface StaggerContainerProps {
  children?: React.ReactNode;
  index?: number;
  initialDelay?: number;
  staggerDelay?: number;
  maxDelay?: number;
  duration?: number;
  direction?: 'down' | 'up' | 'left' | 'right' | 'none';
  entering?: AnimatedProps<ViewProps>['entering'];
  exiting?: AnimatedProps<ViewProps>['exiting'];
  layout?: AnimatedProps<ViewProps>['layout'];
  autoStaggerChildren?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const getAnimationForDirection = (
  direction: 'down' | 'up' | 'left' | 'right' | 'none',
  delay: number,
  duration: number
) => {
  switch (direction) {
    case 'up':
      return FadeInUp.delay(delay).duration(duration).springify().damping(20).stiffness(160);
    case 'left':
      return FadeInLeft.delay(delay).duration(duration).springify().damping(20).stiffness(160);
    case 'right':
      return FadeInRight.delay(delay).duration(duration).springify().damping(20).stiffness(160);
    case 'none':
      return FadeIn.delay(delay).duration(duration).springify().damping(20).stiffness(160);
    case 'down':
    default:
      return FadeInDown.delay(delay).duration(duration).springify().damping(20).stiffness(160);
  }
};

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  index,
  initialDelay = 0,
  staggerDelay = animationTokens.stagger.normal,
  maxDelay = animationTokens.stagger.maxDelay,
  duration = animationTokens.durations.normal,
  direction = 'down',
  entering,
  exiting = FadeOut.duration(animationTokens.durations.fast),
  layout = LinearTransition.springify().damping(22).stiffness(180),
  autoStaggerChildren = false,
  style,
  testID,
}) => {
  // If autoStaggerChildren is enabled, stagger each child
  const childrenArray = React.Children.toArray(children);
  if (autoStaggerChildren && childrenArray.length > 0) {
    return (
      <Animated.View style={style as any} testID={testID} layout={layout}>
        {childrenArray.map((child, childIndex) => {
          if (!React.isValidElement(child)) return child;

          const clampedDelay = Math.min(initialDelay + childIndex * staggerDelay, maxDelay);
          const childEntering = getAnimationForDirection(direction, clampedDelay, duration);

          return (
            <Animated.View
              key={child.key ?? childIndex}
              entering={childEntering}
              exiting={exiting}
              layout={layout}
            >
              {child}
            </Animated.View>
          );
        })}
      </Animated.View>
    );
  }

  // Single staggered item (or container with index)
  const itemIndex = index ?? 0;
  const clampedDelay = Math.min(initialDelay + itemIndex * staggerDelay, maxDelay);
  const resolvedEntering = entering ?? getAnimationForDirection(direction, clampedDelay, duration);

  return (
    <Animated.View
      testID={testID}
      entering={resolvedEntering}
      exiting={exiting}
      layout={layout}
      style={style as any}
    >
      {children}
    </Animated.View>
  );
};

export const StaggerItem = StaggerContainer;

export default StaggerContainer;
