import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useColors, useTypography, useSpacing, useRadii } from '@/src/design/hooks';
import { FrostedCard } from './FrostedCard';
import { MoodBarItem } from './MoodBarItem';
import { MOOD_EMOJIS, MOOD_LABELS } from './EmojiSelector';
import { MoodEntry } from '@/services/moodApi';

export interface MoodInsightsChartProps {
  entries: MoodEntry[];
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * 5-bar distribution chart computed from full history entries array,
 * wrapped in an Apple HIG FrostedCard with Reanimated physics-driven bars.
 */
export function MoodInsightsChart({
  entries,
  title = 'Mood Distribution',
  subtitle = 'Based on your logged history',
  style,
  testID,
}: MoodInsightsChartProps) {
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

  // Compute frequencies for the 5 mood levels (1: Very Sad to 5: Very Happy)
  const frequencies = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (typeof entry.moodLevel === 'number' && entry.moodLevel >= 1 && entry.moodLevel <= 5) {
          counts[entry.moodLevel - 1] += 1;
        }
      }
    }
    return counts;
  }, [entries]);

  const maxFrequency = useMemo(() => Math.max(...frequencies, 0), [frequencies]);
  // 25% headspace buffer ensures peak bar reaches at most 80% of track height
  const chartMax = useMemo(() => Math.max(maxFrequency * 1.25, 1), [maxFrequency]);

  const totalLogs = entries?.length ?? 0;

  return (
    <FrostedCard style={[styles.container, style]} testID={testID}>
      {/* Header with Title, Subtitle, and Total Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          <Text style={[typography.h3, styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text
              style={[
                typography.caption,
                styles.subtitle,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {totalLogs > 0 ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.borderLight,
                borderRadius: radii.full,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs / 2,
              },
            ]}
          >
            <Text
              style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '600' }]}
            >
              {totalLogs} {totalLogs === 1 ? 'log' : 'logs'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 5 Distribution Bars */}
      <View style={[styles.chartArea, { marginTop: spacing.md }]}>
        {MOOD_EMOJIS.map((emoji, index) => {
          const count = frequencies[index];
          // Mathematical formula preserves [5%, 80%] invariant
          const targetHeight = Math.min(Math.max((count / chartMax) * 100, 5), 80);
          const isMostFrequent = count === maxFrequency && count > 0;
          const barColor = isMostFrequent ? moodColors[index] : `${moodColors[index]}60`;

          return (
            <MoodBarItem
              key={index}
              emoji={emoji}
              label={MOOD_LABELS[index]}
              count={count}
              targetHeight={targetHeight}
              color={barColor}
              isMostFrequent={isMostFrequent}
            />
          );
        })}
      </View>
    </FrostedCard>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleColumn: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontWeight: '600',
  },
  subtitle: {
    fontWeight: '400',
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartArea: {
    height: 180,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'stretch',
  },
});

export default MoodInsightsChart;
