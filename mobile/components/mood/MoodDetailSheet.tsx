import React, { useMemo } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useDesignSystem,
  useColors,
  useTypography,
  useSpacing,
  useRadii,
} from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';
import { AnimatedPressable } from '../motion/AnimatedPressable';
import Icon from '../Icon';
import { MOOD_EMOJIS, MOOD_LABELS } from './EmojiSelector';
import { MoodEntry } from '@/services/moodApi';

export interface MoodDetailSheetProps {
  entry: MoodEntry | null;
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

/**
 * Formats full timestamp for detailed entry inspection:
 * e.g., "Thursday, November 7, 2026 at 2:30 PM".
 */
function formatFullInspectionDate(dateString?: string): string {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown date';

  const datePart = date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} at ${timePart}`;
}

/**
 * Interactive Apple HIG frosted bottom sheet modal for inspecting
 * full mood entry details, factors, reflection note, and mood score.
 */
export function MoodDetailSheet({ entry, visible, onClose, testID }: MoodDetailSheetProps) {
  const { theme } = useDesignSystem();
  const isDark = theme.isDark;
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const insets = useSafeAreaInsets();

  const moodColors = useMemo(
    () => [
      colors.mood.verySad,
      colors.mood.sad,
      colors.mood.neutral,
      colors.mood.happy,
      colors.mood.veryHappy,
    ],
    [colors]
  );

  if (!entry) {
    return null;
  }

  const level = Math.min(Math.max(entry.moodLevel ?? 3, 1), 5);
  const moodColor = moodColors[level - 1];
  const emoji = MOOD_EMOJIS[level - 1];
  const label = MOOD_LABELS[level - 1];
  const formattedFullDate = formatFullInspectionDate(entry.createdAt);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop Pressable */}
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(15, 23, 42, 0.45)',
            },
          ]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss details sheet"
        />

        {/* Bottom Sheet Card */}
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              borderTopLeftRadius: radii.xl ?? 24,
              borderTopRightRadius: radii.xl ?? 24,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >

          {/* Grab Handle */}
          <View
            style={[
              styles.grabHandle,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
                marginVertical: spacing.sm,
              },
            ]}
          />

          {/* Sheet Header */}
          <View style={[styles.sheetHeader, { paddingHorizontal: spacing.lg }]}>
            <Text style={[typography.h3, styles.headerTitle, { color: colors.text }]}>
              Mood Entry Details
            </Text>
            <AnimatedPressable
              scaleTo={0.9}
              springConfig={animationTokens.springs.bouncy}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close entry details"
              style={styles.closeBtn}
            >
              <Icon name="close-circle" size={28} color={colors.textMuted} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Mood & Score */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: `${moodColor}12`,
                  borderColor: `${moodColor}30`,
                  borderRadius: radii.lg,
                  padding: spacing.md,
                },
              ]}
            >
              <View
                style={[
                  styles.heroEmojiCircle,
                  {
                    backgroundColor: `${moodColor}20`,
                    borderColor: moodColor,
                  },
                ]}
              >
                <Text style={styles.heroEmoji}>{emoji}</Text>
              </View>

              <Text
                style={[
                  typography.h2,
                  styles.heroLabel,
                  { color: moodColor, marginTop: spacing.xs },
                ]}
              >
                {label}
              </Text>

              {/* Mood Score Badge */}
              <View
                style={[
                  styles.scoreBadge,
                  {
                    backgroundColor: moodColor,
                    borderRadius: radii.full,
                    marginTop: spacing.xs,
                  },
                ]}
              >
                <Text style={[typography.captionSmall, styles.scoreBadgeText]}>
                  Mood Score: {level} / 5
                </Text>
              </View>
            </View>

            {/* Timestamp */}
            <View style={[styles.infoRow, { marginTop: spacing.md }]}>
              <Icon
                name="time-outline"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {formattedFullDate}
              </Text>
            </View>

            {/* Contributing Factors */}
            <View style={{ marginTop: spacing.lg }}>
              <Text
                style={[
                  typography.h4,
                  styles.sectionTitle,
                  { color: colors.text, marginBottom: spacing.sm },
                ]}
              >
                Contributing Factors
              </Text>

              {entry.factors && entry.factors.length > 0 ? (
                <View style={styles.factorsList}>
                  {entry.factors.map((factor) => (
                    <View
                      key={factor}
                      style={[
                        styles.factorChip,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceAlt,
                          borderColor: colors.borderLight,
                          borderRadius: radii.full,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.xs,
                        },
                      ]}
                    >
                      <Text style={[typography.caption, { color: colors.text, fontWeight: '500' }]}>
                        {factor}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[typography.body, { color: colors.textMuted, fontStyle: 'italic' }]}>
                  No contributing factors recorded.
                </Text>
              )}
            </View>

            {/* Personal Reflection Note */}
            <View style={{ marginTop: spacing.lg }}>
              <Text
                style={[
                  typography.h4,
                  styles.sectionTitle,
                  { color: colors.text, marginBottom: spacing.sm },
                ]}
              >
                Personal Reflection
              </Text>

              <View
                style={[
                  styles.noteBox,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.surfaceAlt,
                    borderColor: colors.borderLight,
                    borderRadius: radii.md,
                    padding: spacing.md,
                  },
                ]}
              >
                {entry.note && entry.note.trim().length > 0 ? (
                  <Text style={[typography.body, { color: colors.text, lineHeight: 22 }]}>
                    &ldquo;{entry.note.trim()}&rdquo;
                  </Text>
                ) : (
                  <Text style={[typography.body, { color: colors.textMuted, fontStyle: 'italic' }]}>
                    No reflection note recorded for this entry.
                  </Text>
                )}
              </View>
            </View>

            {/* Dismiss Button */}
            <View style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
              <AnimatedPressable
                scaleTo={animationTokens.micro.buttonPressScale}
                springConfig={animationTokens.springs.snappy}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Dismiss entry details"
                style={[
                  styles.dismissBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radii.md,
                    paddingVertical: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.button, { color: colors.textInverse, fontWeight: '600' }]}>
                  Done
                </Text>
              </AnimatedPressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '88%',
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 16,
    shadowOpacity: 0.2,
    shadowColor: '#000000',
    elevation: 10,
  },
  grabHandle: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  headerTitle: {
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingTop: 8,
  },
  heroCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroEmojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 44,
  },
  heroLabel: {
    fontWeight: '700',
    textAlign: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scoreBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '600',
  },
  factorsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  factorChip: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  noteBox: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  dismissBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MoodDetailSheet;
