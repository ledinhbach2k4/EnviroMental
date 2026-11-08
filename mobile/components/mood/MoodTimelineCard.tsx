import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
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
import { FrostedCard } from './FrostedCard';
import { MOOD_EMOJIS, MOOD_LABELS } from './EmojiSelector';
import { MoodEntry } from '@/services/moodApi';

export interface MoodTimelineCardProps {
  entry: MoodEntry;
  onPress?: (entry: MoodEntry) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Formats an ISO date string into Apple HIG conversational timestamps:
 * "Today at 2:30 PM", "Yesterday at 10:15 AM", or "Nov 7 at 2:30 PM".
 */
export function formatTimelineTimestamp(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Recently';
  }

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }
  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Historical mood timeline entry card wrapped in an Apple HIG FrostedCard.
 * Features a semantic left mood status badge, timestamp, factor pills,
 * reflection note preview, and tactile press feedback for detailed inspection.
 */
export function MoodTimelineCard({ entry, onPress, style, testID }: MoodTimelineCardProps) {
  const { theme } = useDesignSystem();
  const isDark = theme.isDark;
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();

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

  const level = Math.min(Math.max(entry.moodLevel ?? 3, 1), 5);
  const moodColor = moodColors[level - 1];
  const emoji = MOOD_EMOJIS[level - 1];
  const label = MOOD_LABELS[level - 1];
  const formattedTime = formatTimelineTimestamp(entry.createdAt);

  const cardContent = (
    <FrostedCard style={styles.frostedCard} contentStyle={styles.cardInner}>
      <View style={styles.cardRow}>
        {/* Left mood status badge */}
        <View
          style={[
            styles.moodBadge,
            {
              backgroundColor: `${moodColor}18`,
              borderColor: moodColor,
            },
          ]}
        >
          <Text style={styles.badgeEmoji}>{emoji}</Text>
        </View>

        {/* Content column */}
        <View style={styles.contentCol}>
          <View style={styles.titleRow}>
            <Text style={[typography.bodyLarge, styles.moodTitle, { color: colors.text }]}>
              {label}
            </Text>
            {onPress ? <Icon name="chevron-forward" size={16} color={colors.textMuted} /> : null}
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            {formattedTime}
          </Text>

          {/* Factor pills */}
          {entry.factors && entry.factors.length > 0 ? (
            <View style={[styles.factorsRow, { marginTop: spacing.xs }]}>
              {entry.factors.map((factor, factorIndex) => (
                <View
                  key={`${factor}-${factorIndex}`}
                  style={[
                    styles.factorPill,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceAlt,
                      borderColor: colors.borderLight,
                      borderRadius: radii.full,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                    },
                  ]}
                >
                  <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
                    {factor}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Personal reflection note preview */}
          {entry.note && entry.note.trim().length > 0 ? (
            <View
              style={[
                styles.notePreview,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : colors.surfaceAlt,
                  borderColor: colors.borderLight,
                  borderRadius: radii.sm,
                  marginTop: spacing.xs,
                  padding: spacing.xs,
                },
              ]}
            >
              <Text
                style={[typography.bodySmall, { color: colors.textSecondary, fontStyle: 'italic' }]}
                numberOfLines={2}
              >
                &ldquo;{entry.note.trim()}&rdquo;
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </FrostedCard>
  );

  return onPress ? (
    <AnimatedPressable
      scaleTo={animationTokens.micro.cardPressScale ?? 0.98}
      springConfig={animationTokens.springs.snappy}
      onPress={() => onPress(entry)}
      accessibilityRole="button"
      accessibilityLabel={`Mood entry: ${label}, ${formattedTime}`}
      style={[styles.container, style]}
      testID={testID}
    >
      {cardContent}
    </AnimatedPressable>
  ) : (
    <View style={[styles.container, style]} testID={testID}>
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  frostedCard: {
    width: '100%',
  },
  cardInner: {
    padding: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  moodBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeEmoji: {
    fontSize: 22,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moodTitle: {
    fontWeight: '600',
  },
  factorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  factorPill: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notePreview: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default MoodTimelineCard;
