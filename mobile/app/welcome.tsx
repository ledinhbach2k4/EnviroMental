import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useColors, useTypography, useSpacing } from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';
import Button from '@/components/Button';
import { Image } from 'expo-image';

const WelcomeScreen = () => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();

  const [started, setStarted] = useState(false);
  const transition = useSharedValue(0);

  const handleGetStarted = () => {
    setStarted(true);
    transition.value = withTiming(1, {
      duration: animationTokens.durations.moderate,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  };

  const introAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 1], [1, 0]),
    transform: [{ translateY: interpolate(transition.value, [0, 1], [0, -15]) }],
  }));

  const optionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 1], [0, 1]),
    transform: [{ translateY: interpolate(transition.value, [0, 1], [25, 0]) }],
  }));

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    contentWrapper: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      minHeight: 320,
    },
    absoluteFill: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <View style={styles.contentWrapper}>
          <Animated.View
            style={[styles.absoluteFill, introAnimatedStyle]}
            pointerEvents={started ? 'none' : 'auto'}
          >
            <Image
              source={require('../assets/images/adaptive-icon.png')}
              style={{ width: 400, height: 400, marginBottom: 5 }}
              contentFit="contain"
            />
            <Text
              style={[
                typography.h1,
                { color: colors.primary, marginBottom: spacing.md, textAlign: 'center' },
              ]}
            >
              Welcome to the app!
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
              ]}
            >
              Discover your journey to mental wellness with helpful tools and articles.
            </Text>
            <Button
              text="Get Started"
              onPress={handleGetStarted}
              variant="primary"
              style={{ width: '80%' }}
            />
          </Animated.View>

          <Animated.View
            style={[styles.absoluteFill, optionsAnimatedStyle]}
            pointerEvents={started ? 'auto' : 'none'}
          >
            <Text
              style={[
                typography.h2,
                { color: colors.primary, marginBottom: spacing.lg, textAlign: 'center' },
              ]}
            >
              Start your journey
            </Text>
            <Button
              text="Sign In"
              onPress={() => router.push('/(auth)/sign-in' as any)}
              variant="primary"
              style={{ marginBottom: spacing.md, width: '80%' }}
            />
            <Button
              text="Sign Up"
              onPress={() => router.push('/(auth)/sign-up' as any)}
              variant="secondary"
              style={{ width: '80%' }}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

export default WelcomeScreen;
