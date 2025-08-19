import { useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

export type EasingFn = (value: number) => number;

export interface TransitionConfig {
  duration?: number;
  easing?: EasingFn;
  from?: number; // initial progress value
  to?: number;   // target progress value when starting
  initialStarted?: boolean;
  delay?: number;
}

export interface StartOptions {
  toValue?: number;
  duration?: number;
  easing?: EasingFn;
  delay?: number;
}

// Keep typing permissive to avoid RN Animated complex generic types friction
export type AnimatedStyle = any;

export function useTransition(config: TransitionConfig = {}) {
  const {
    duration = 450,
    easing = Easing.out(Easing.cubic),
    from = 0,
    to = 1,
    initialStarted = false,
    delay = 0,
  } = config;

  const [started, setStarted] = useState<boolean>(initialStarted);
  const progressRef = useRef(new Animated.Value(initialStarted ? to : from));
  const progress = progressRef.current;

  const start = (opts: StartOptions = {}) => {
    if (started) return;
    setStarted(true);
    Animated.timing(progress, {
      toValue: opts.toValue ?? to,
      duration: opts.duration ?? duration,
      easing: opts.easing ?? easing,
      delay: opts.delay ?? delay,
      useNativeDriver: true,
    }).start();
  };

  const reset = (instant = true) => {
    setStarted(false);
    if (instant) {
      progress.setValue(from);
    } else {
      Animated.timing(progress, {
        toValue: from,
        duration,
        easing,
        useNativeDriver: true,
      }).start();
    }
  };

  // Helpers to produce commonly used animated styles from the same progress
  const fadeIn = (opts?: { from?: number; to?: number }): AnimatedStyle => {
    const f = opts?.from ?? 0;
    const t = opts?.to ?? 1;
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [f, t] });
    return { opacity };
  };

  const fadeOut = (opts?: { from?: number; to?: number }): AnimatedStyle => {
    const f = opts?.from ?? 1;
    const t = opts?.to ?? 0;
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [f, t] });
    return { opacity };
  };

  const slideYIn = (opts?: { from?: number; to?: number }): AnimatedStyle => {
    const f = opts?.from ?? 20;
    const t = opts?.to ?? 0;
    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [f, t] });
    return { transform: [{ translateY }] };
  };

  const slideYOut = (opts?: { from?: number; to?: number }): AnimatedStyle => {
    const f = opts?.from ?? 0;
    const t = opts?.to ?? -10;
    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [f, t] });
    return { transform: [{ translateY }] };
  };

  const slideXIn = (opts?: { from?: number; to?: number }): AnimatedStyle => {
    const f = opts?.from ?? 20;
    const t = opts?.to ?? 0;
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [f, t] });
    return { transform: [{ translateX }] };
  };

  const slideXOut = (opts?: { from?: number; to?: number }): AnimatedStyle => {
    const f = opts?.from ?? 0;
    const t = opts?.to ?? -10;
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [f, t] });
    return { transform: [{ translateX }] };
  };

  const scaleIn = (opts?: { from?: number; to?: number }): AnimatedStyle => {
    const f = opts?.from ?? 0.96;
    const t = opts?.to ?? 1;
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [f, t] });
    return { transform: [{ scale }] };
    };

  const scaleOut = (opts?: { from?: number; to?: number }): AnimatedStyle => {
    const f = opts?.from ?? 1;
    const t = opts?.to ?? 0.98;
    const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [f, t] });
    return { transform: [{ scale }] };
  };

  const rotateIn = (opts?: { fromDeg?: number; toDeg?: number }): AnimatedStyle => {
    const f = opts?.fromDeg ?? -4;
    const t = opts?.toDeg ?? 0;
    const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: [`${f}deg`, `${t}deg`] });
    return { transform: [{ rotate }] };
  };

  const rotateOut = (opts?: { fromDeg?: number; toDeg?: number }): AnimatedStyle => {
    const f = opts?.fromDeg ?? 0;
    const t = opts?.toDeg ?? 4;
    const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: [`${f}deg`, `${t}deg`] });
    return { transform: [{ rotate }] };
  };

  // Crossfade + swap vertical positions (out goes up, in comes from below)
  const crossfadeSwap = (opts?: {
    outOffsetY?: number; // how much the outgoing view moves up
    inOffsetY?: number;  // how much the incoming view moves down initially
  }): { outStyle: AnimatedStyle; inStyle: AnimatedStyle } => {
    const outOffsetY = opts?.outOffsetY ?? -10;
    const inOffsetY = opts?.inOffsetY ?? 20;

    const outOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    const outTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, outOffsetY] });

    const inOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const inTranslateY = progress.interpolate({ inputRange: [0, 1], outputRange: [inOffsetY, 0] });

    return {
      outStyle: { opacity: outOpacity, transform: [{ translateY: outTranslateY }] },
      inStyle: { opacity: inOpacity, transform: [{ translateY: inTranslateY }] },
    };
  };

  // Generic mapper if you want to quickly map progress -> any numeric range
  const map = (fromValue: number, toValue: number) =>
    progress.interpolate({ inputRange: [0, 1], outputRange: [fromValue, toValue] });

  return {
    // state
    progress,
    started,

    // controls
    start,
    reset,

    // helpers
    fadeIn,
    fadeOut,
    slideYIn,
    slideYOut,
    slideXIn,
    slideXOut,
    scaleIn,
    scaleOut,
    rotateIn,
    rotateOut,
    crossfadeSwap,
    map,
  } as const;
}

export default useTransition;
