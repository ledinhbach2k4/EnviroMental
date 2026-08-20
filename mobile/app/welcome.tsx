import React from 'react';
import { View, Text, Animated } from 'react-native';
import { router } from 'expo-router';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import Button from '@/components/Button';
import { Image } from 'expo-image';
import useTransition from '@/hooks/useTransition';
import { StyleSheet } from 'react-native';

const WelcomeScreen = () => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const { started, start, crossfadeSwap } = useTransition({ duration: 450 });

  const { outStyle: introStyle, inStyle: optionsStyle } = crossfadeSwap({ outOffsetY: -10, inOffsetY: 20 });

  const handleGetStarted = () => {
    start();
  };

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
            style={{
              ...styles.absoluteFill,
              ...introStyle,
            }}
            pointerEvents={started ? 'none' : 'auto'}
          >
            <Image
              source={require('../assets/images/adaptive-icon.png')}
              style={{ width: 400, height: 400, marginBottom: 5 }}
              contentFit="contain"
            />
            <Text style={[typography.h1, { color: colors.primary, marginBottom: spacing.md, textAlign: 'center' }]}> 
              Welcome to the app!
            </Text>
            <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg }]}> 
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
            style={{
              ...styles.absoluteFill,
              ...optionsStyle,
            }}
            pointerEvents={started ? 'auto' : 'none'}
          >
            <Text style={[typography.h2, { color: colors.primary, marginBottom: spacing.lg, textAlign: 'center' }]}> 
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