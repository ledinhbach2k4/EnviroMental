import React, { useEffect } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { usePathname } from 'expo-router';
import useTransition from '@/hooks/useTransition';

type Props = {
  children: React.ReactNode;
  duration?: number;
  offsetY?: number;
  delay?: number;
  style?: ViewStyle;
};

const PageTransition: React.FC<Props> = ({
  children,
  duration = 250,
  offsetY = 8,
  delay = 0,
  style,
}) => {
  const pathname = usePathname();
  const { start, reset, map } = useTransition({ duration, delay });

  useEffect(() => {
    // Reset and start on every route change
    reset(true);
    const id = requestAnimationFrame(() => start());
    return () => cancelAnimationFrame(id as any);
  }, [pathname]);

  const opacity = map(0.85, 1);
  const translateY = map(offsetY, 0);

  return (
    <Animated.View style={[{ flex: 1, opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
};

export default PageTransition;
