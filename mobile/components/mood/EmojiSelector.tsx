import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { useDesignSystem, useColors, useTypography, useSpacing } from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';

export const MOOD_EMOJIS = ['😫', '🙁', '😐', '🙂', '😄'] as const;
export const MOOD_LABELS = ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'] as const;

export interface EmojiSelectorProps {
  selectedMood: number | null;
  onSelectMood: (index: number) => void;
  scaleTo?: number;
  springConfig?: WithSpringConfig;
  disabled?: boolean;
  title?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface EmojiItemProps {
  emoji: string;
  label: string;
  index: number;
  isSelected: boolean;
  color: string;
  onPress: () => void;
  scaleTo?: number;
  springConfig?: WithSpringConfig;
  disabled?: boolean;
}

function EmojiItem({
  emoji,
  label,
  index: _index,
  isSelected,
  color,
  onPress,
  scaleTo,
  springConfig,
  disabled,
}: EmojiItemProps) {
  const { theme } = useDesignSystem();
  const isDark = theme.isDark;
  const colors = useColors();

  const activeScale = useSharedValue(isSelected ? 1.15 : 1);

  useEffect(() => {
    activeScale.value = isSelected
      ? withSpring(1.15, animationTokens.springs.bouncy)
      : withSpring(1, animationTokens.springs.bouncy);
  }, [isSelected, activeScale]);

  const animatedEmojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: activeScale.value }],
  }));

  const unselectedBg = isDark ? 'rgba(255, 255, 255, 0.06)' : colors.surfaceAlt;
  const unselectedBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border;

  return (
    <AnimatedPressable
      scaleTo={scaleTo ?? 0.88}
      springConfig={springConfig ?? animationTokens.springs.bouncy}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected, disabled }}
      style={styles.pressable}
    >
      <Animated.View
        style={[
          styles.emojiCircle,
          {
            backgroundColor: isSelected ? `${color}28` : unselectedBg,
            borderColor: isSelected ? color : unselectedBorder,
            borderWidth: isSelected ? 2 : 1,
            shadowColor: color,
            shadowOpacity: isSelected ? 0.65 : 0,
            shadowRadius: isSelected ? 12 : 0,
            shadowOffset: { width: 0, height: 0 },
            elevation: isSelected ? 8 : 0,
          },
          animatedEmojiStyle,
        ]}
      >
        <Text style={styles.emojiText}>{emoji}</Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

/**
 * 5 interactive mood emojis with bouncy spring physics,
 * active glowing halo shadow, and Apple HIG labels.
 */
export function EmojiSelector({
  selectedMood,
  onSelectMood,
  scaleTo = 0.88,
  springConfig = animationTokens.springs.bouncy,
  disabled = false,
  title = 'How do you feel?',
  style,
  testID,
}: EmojiSelectorProps) {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();

  const moodColors = [
    colors.mood.verySad,
    colors.mood.sad,
    colors.mood.neutral,
    colors.mood.happy,
    colors.mood.veryHappy,
  ];

  return (
    <View style={[styles.container, style]} testID={testID}>
      {title ? (
        <Text
          style={[typography.body, styles.title, { color: colors.text, marginBottom: spacing.sm }]}
        >
          {title}
        </Text>
      ) : null}
      <View style={styles.row}>
        {MOOD_EMOJIS.map((emoji, index) => (
          <EmojiItem
            key={index}
            emoji={emoji}
            label={MOOD_LABELS[index]}
            index={index}
            isSelected={selectedMood === index}
            color={moodColors[index]}
            onPress={() => onSelectMood(index)}
            scaleTo={scaleTo ?? 0.88}
            springConfig={springConfig ?? animationTokens.springs.bouncy}
            disabled={disabled}
          />
        ))}
      </View>
      <View style={styles.labelContainer}>
        {selectedMood !== null ? (
          <Text
            style={[typography.caption, styles.selectedLabel, { color: moodColors[selectedMood] }]}
          >
            {MOOD_LABELS[selectedMood]}
          </Text>
        ) : (
          <Text style={[typography.caption, styles.selectedLabel, { color: colors.textMuted }]}>
            Tap to select
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  emojiCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 26,
  },
  labelContainer: {
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  selectedLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default EmojiSelector;
