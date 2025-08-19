import React from 'react';
import { View, Text, Animated } from 'react-native';
import { router } from 'expo-router';
import { colors, textStyles, commonStyles } from '@/assets/styles/commonStyles';
import Button from '@/components/Button';
import { Image } from 'expo-image';
import useTransition from '@/hooks/useTransition';

const WelcomeScreen = () => {
  const { started, start, crossfadeSwap } = useTransition({ duration: 450 });

  const { outStyle: introStyle, inStyle: optionsStyle } = crossfadeSwap({ outOffsetY: -10, inOffsetY: 20 });

  const handleGetStarted = () => {
    start();
  };

  return (
    <View style={commonStyles.container}>
      <View style={[commonStyles.centerContent, { paddingHorizontal: 20 }]}>        
        {/* Animated Content Area (overlapped) */}
        <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: 320 }}>
          {/* Intro View */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              alignItems: 'center',
              ...introStyle,
            }}
            pointerEvents={started ? 'none' : 'auto'}
          >
            <Image
              source={require('../assets/images/adaptive-icon.png')}
              style={{ width: 400, height: 400, marginBottom: 5 }}
              contentFit="contain"
            />
            <Text style={[textStyles.h1, { color: colors.primary, marginBottom: 10, textAlign: 'center' }]}> 
              Welcome to the app!
            </Text>
            <Text style={[textStyles.body, { color: colors.textLight, textAlign: 'center', marginBottom: 20 }]}> 
              Discover your journey to mental wellness with helpful tools and articles.
            </Text>
            <Button
              text="Get Started"
              onPress={handleGetStarted}
              variant="primary"
              style={{ width: '80%' }}
            />
          </Animated.View>

          {/* Options View */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              alignItems: 'center',
              ...optionsStyle,
            }}
            pointerEvents={started ? 'auto' : 'none'}
          >
            <Text style={[textStyles.h2, { color: colors.primary, marginBottom: 16, textAlign: 'center' }]}> 
              Start your journey
            </Text>
            <Button
              text="Sign In"
              onPress={() => router.push('/(auth)/sign-in' as any)}
              variant="primary"
              style={{ marginBottom: 10, width: '80%' }}
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
