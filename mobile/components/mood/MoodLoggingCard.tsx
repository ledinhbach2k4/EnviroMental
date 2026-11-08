import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { WithSpringConfig } from 'react-native-reanimated';
import {
  useDesignSystem,
  useColors,
  useTypography,
  useSpacing,
  useRadii,
} from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import { FrostedCard } from './FrostedCard';
import { EmojiSelector } from './EmojiSelector';
import { FactorChipGroup } from './FactorChipGroup';
import { MoodNoteInput } from './MoodNoteInput';
import { MoodCooldownView } from './MoodCooldownView';

export interface MoodLoggingCardProps {
  canLog?: boolean;
  cooldownReason?: 'limit' | 'time' | null;
  todaysLogCount?: number;
  maxLogsPerDay?: number;
  timeToNextLog?: string;
  selectedMood?: number | null;
  onSelectMood?: (index: number) => void;
  setSelectedMood?: (mood: number | null) => void;
  selectedFactors?: string[];
  onToggleFactor?: (factor: string) => void;
  toggleFactor?: (factor: string) => void;
  moodNote?: string;
  onChangeNote?: (note: string) => void;
  setMoodNote?: (note: string) => void;
  onSave?: () => void | Promise<boolean>;
  saveMoodEntry?: () => Promise<boolean>;
  isSubmitting?: boolean;
  scaleTo?: number;
  springConfig?: WithSpringConfig;
  factorScaleTo?: number;
  factorSpringConfig?: WithSpringConfig;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Master Apple HIG mood logging card orchestrating the logging experience.
 * Wraps content in FrostedCard, renders daily log counter badge, and conditionally
 * presents MoodCooldownView vs active form with physics-based spring interactions.
 */
export function MoodLoggingCard(props: MoodLoggingCardProps) {
  const {
    canLog = true,
    cooldownReason = null,
    todaysLogCount = 0,
    maxLogsPerDay = 6,
    timeToNextLog,
    selectedMood = null,
    onSelectMood,
    setSelectedMood,
    selectedFactors = [],
    onToggleFactor,
    toggleFactor,
    moodNote = '',
    onChangeNote,
    setMoodNote,
    onSave,
    saveMoodEntry,
    isSubmitting = false,
    scaleTo = 0.88,
    springConfig = animationTokens.springs.bouncy,
    factorScaleTo = 0.92,
    factorSpringConfig = animationTokens.springs.bouncy,
    style,
    testID,
  } = props;

  const { theme } = useDesignSystem();
  const isDark = theme.isDark;
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();

  const handleSelectMood = (index: number) => {
    if (onSelectMood) {
      onSelectMood(index);
    } else if (setSelectedMood) {
      setSelectedMood(index);
    }
  };

  const handleToggleFactor = (factor: string) => {
    if (onToggleFactor) {
      onToggleFactor(factor);
    } else if (toggleFactor) {
      toggleFactor(factor);
    }
  };

  const handleChangeNote = (note: string) => {
    if (onChangeNote) {
      onChangeNote(note);
    } else if (setMoodNote) {
      setMoodNote(note);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    } else if (saveMoodEntry) {
      saveMoodEntry();
    }
  };

  return (
    <FrostedCard style={[styles.card, style]} testID={testID}>
      <View style={styles.headerRow}>
        <Text style={[typography.h3, { color: colors.text }]}>Log Your Mood</Text>
        <View
          style={[
            styles.counterBadge,
            {
              borderRadius: radii.full,
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {todaysLogCount}/{maxLogsPerDay} logged today
          </Text>
        </View>
      </View>

      {!canLog ? (
        <MoodCooldownView
          reason={cooldownReason}
          todaysLogCount={todaysLogCount}
          maxLogsPerDay={maxLogsPerDay}
          timeToNextLog={timeToNextLog}
        />
      ) : (
        <View style={styles.formContent}>
          <View style={{ marginBottom: spacing.lg }}>
            <EmojiSelector
              selectedMood={selectedMood}
              onSelectMood={handleSelectMood}
              scaleTo={scaleTo ?? 0.88}
              springConfig={springConfig ?? animationTokens.springs.bouncy}
              disabled={isSubmitting}
            />
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            <FactorChipGroup
              selectedFactors={selectedFactors}
              onToggleFactor={handleToggleFactor}
              scaleTo={factorScaleTo ?? 0.92}
              springConfig={factorSpringConfig ?? animationTokens.springs.bouncy}
              disabled={isSubmitting}
            />
          </View>

          <View style={{ marginBottom: spacing.lg }}>
            <MoodNoteInput
              value={moodNote}
              onChangeText={handleChangeNote}
              disabled={isSubmitting}
            />
          </View>

          <AnimatedPressable
            onPress={handleSave}
            disabled={isSubmitting || selectedMood === null}
            springConfig={animationTokens.springs.snappy}
            scaleTo={animationTokens.micro.buttonPressScale}
            style={[
              styles.saveButton,
              {
                borderRadius: radii.lg,
                backgroundColor:
                  isSubmitting || selectedMood === null
                    ? isDark
                      ? 'rgba(255, 255, 255, 0.12)'
                      : `${colors.primary}60`
                    : colors.primary,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save Mood"
            accessibilityState={{ disabled: isSubmitting || selectedMood === null }}
          >
            <Text
              style={[
                typography.button,
                styles.saveButtonText,
                {
                  color:
                    isSubmitting || selectedMood === null
                      ? isDark
                        ? 'rgba(255, 255, 255, 0.4)'
                        : colors.textInverse
                      : colors.textInverse,
                },
              ]}
            >
              {isSubmitting ? 'Saving...' : 'Save Mood'}
            </Text>
          </AnimatedPressable>
        </View>
      )}
    </FrostedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  counterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContent: {
    width: '100%',
  },
  saveButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MoodLoggingCard;
