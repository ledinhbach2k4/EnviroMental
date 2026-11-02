import React from 'react';
import { ScrollView, Text, TouchableOpacity, Linking, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';
import { AnimatedPressable } from '../components/motion/AnimatedPressable';
import Icon from '../components/Icon';

const hotlines = [
  { name: 'National Suicide Prevention Lifeline', number: '988', country: 'US' },
  { name: 'Crisis Text Line', number: 'Text HOME to 741741', country: 'US' },
  {
    name: 'International Association for Suicide Prevention',
    number: 'https://www.iasp.info/resources/Crisis_Centres/',
    country: 'International',
  },
];

export default function EmergencyScreen() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const callNumber = (number: string) => {
    if (/^\d+$/.test(number)) {
      Linking.openURL(`tel:${number}`);
    } else {
      Linking.openURL(number);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
    },
    backButton: {
      marginBottom: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginVertical: spacing.xs,
      ...shadows.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>

      <Animated.View entering={FadeInDown.delay(50).springify().damping(20)}>
        <Text style={[typography.h1, { color: colors.danger, marginBottom: spacing.sm }]}>
          Emergency Support
        </Text>
        <Text style={[typography.body, { marginBottom: spacing.xl }]}>
          If you are in immediate danger, please call your local emergency services.
        </Text>
      </Animated.View>

      {hotlines.map((hotline, index) => (
        <Animated.View
          key={index}
          entering={FadeInDown.delay(Math.min(100 + index * 60, 400))
            .springify()
            .damping(20)}
        >
          <AnimatedPressable
            style={styles.card}
            scaleTo={animationTokens.micro.cardPressScale}
            onPress={() => callNumber(hotline.number)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="call"
                size={24}
                color={colors.danger}
                style={{ marginRight: spacing.md }}
              />
              <View style={{ flex: 1 }}>
                <Text style={typography.body}>{hotline.name}</Text>
                <Text style={typography.caption}>{hotline.country}</Text>
              </View>
              <Text style={[typography.body, { color: colors.primary }]}>{hotline.number}</Text>
            </View>
          </AnimatedPressable>
        </Animated.View>
      ))}
    </ScrollView>
  );
}
