import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useColors, useTypography, useSpacing, useRadii } from '@/src/design/hooks';
import Icon from '../Icon';
import { FrostedCard } from './FrostedCard';
import { MoodTimelineCard } from './MoodTimelineCard';
import { MoodEntry } from '@/services/moodApi';

export interface MoodTimelineSectionProps {
  entries: MoodEntry[];
  onSelectEntry?: (entry: MoodEntry) => void;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface TimelineGroup {
  key: string;
  title: string;
  entries: MoodEntry[];
}

/**
 * Historical mood timeline with a vertical hairline spine (1.5px),
 * circular status nodes with mood semantic colors, date grouping (Today, Yesterday, Older),
 * full history rendering without truncation, and an Apple HIG empty state.
 */
export function MoodTimelineSection({
  entries,
  onSelectEntry,
  title = 'Timeline History',
  subtitle,
  style,
  testID,
}: MoodTimelineSectionProps) {
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

  // Group entries chronologically descending into Today, Yesterday, and Older
  const groups = useMemo(() => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }

    const sorted = [...entries].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();

    const todayItems: MoodEntry[] = [];
    const yesterdayItems: MoodEntry[] = [];
    const olderItems: MoodEntry[] = [];

    for (const entry of sorted) {
      const entryDate = new Date(entry.createdAt);
      if (isNaN(entryDate.getTime())) {
        olderItems.push(entry);
        continue;
      }
      const entryDayStart = new Date(
        entryDate.getFullYear(),
        entryDate.getMonth(),
        entryDate.getDate()
      ).getTime();

      if (entryDayStart === todayStart) {
        todayItems.push(entry);
      } else if (entryDayStart === yesterdayStart) {
        yesterdayItems.push(entry);
      } else {
        olderItems.push(entry);
      }
    }

    const result: TimelineGroup[] = [];
    if (todayItems.length > 0) {
      result.push({ key: 'today', title: 'Today', entries: todayItems });
    }
    if (yesterdayItems.length > 0) {
      result.push({ key: 'yesterday', title: 'Yesterday', entries: yesterdayItems });
    }
    if (olderItems.length > 0) {
      result.push({ key: 'older', title: 'Older', entries: olderItems });
    }
    return result;
  }, [entries]);

  if (!entries || entries.length === 0) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>

        <FrostedCard style={styles.emptyCard} contentStyle={styles.emptyInner}>
          <Icon name="calendar-outline" size={42} color={colors.textMuted} />
          <Text
            style={[
              typography.h3,
              styles.emptyTitle,
              { color: colors.text, marginTop: spacing.sm },
            ]}
          >
            No Mood Entries Yet
          </Text>
          <Text
            style={[
              typography.body,
              styles.emptySubtitle,
              { color: colors.textSecondary, marginTop: spacing.xs },
            ]}
          >
            Your logged moods will appear here along your timeline.
          </Text>
        </FrostedCard>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Section Header */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={[typography.h3, styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text
              style={[
                typography.caption,
                styles.sectionSubtitle,
                { color: colors.textSecondary, marginTop: 2 },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.countBadge,
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
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      </View>

      {/* Date Groups */}
      {groups.map((group, groupIndex) => (
        <View
          key={group.key || group.title || `group-${groupIndex}`}
          style={{ marginTop: groupIndex === 0 ? spacing.sm : spacing.lg }}
        >
          {/* Date Group Heading */}
          <View style={styles.groupHeaderRow}>
            <Text style={[typography.h4, styles.groupHeading, { color: colors.text }]}>
              {group.title}
            </Text>
            <Text style={[typography.captionSmall, { color: colors.textMuted, marginLeft: 8 }]}>
              {group.entries.length}
            </Text>
          </View>

          {/* Timeline Spine & Nodes */}
          <View style={styles.timelineList}>
            {group.entries.map((entry, entryIndex) => {
              const level = Math.min(Math.max(entry.moodLevel ?? 3, 1), 5);
              const nodeColor = moodColors[level - 1];
              const isFirst = entryIndex === 0;
              const isLast = entryIndex === group.entries.length - 1;
              const entryKey = entry.id
                ? String(entry.id)
                : `${group.key || 'group'}-${entry.createdAt || entryIndex}-${entryIndex}`;

              return (
                <View key={entryKey} style={styles.timelineItemRow}>
                  {/* Left Spine & Status Node */}
                  <View style={styles.spinedCol}>
                    {/* Continuous vertical hairline spine */}
                    <View
                      style={[
                        styles.spineLine,
                        {
                          backgroundColor: colors.borderLight,
                          top: isFirst ? 28 : 0,
                          bottom: isLast ? 'auto' : 0,
                          height: isLast ? (isFirst ? 0 : 28) : undefined,
                        },
                      ]}
                    />

                    {/* Circular status node */}
                    <View
                      style={[
                        styles.statusNode,
                        {
                          backgroundColor: nodeColor,
                          borderColor: colors.background,
                        },
                      ]}
                    />
                  </View>

                  {/* Right Timeline Card */}
                  <View style={styles.cardCol}>
                    <MoodTimelineCard
                      entry={entry}
                      onPress={onSelectEntry}
                      style={{ marginBottom: spacing.sm }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontWeight: '400',
  },
  countBadge: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    width: '100%',
    marginTop: 8,
  },
  emptyInner: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  groupHeading: {
    fontWeight: '600',
  },
  timelineList: {
    width: '100%',
  },
  timelineItemRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  spinedCol: {
    width: 26,
    alignItems: 'center',
    position: 'relative',
  },
  spineLine: {
    position: 'absolute',
    left: '50%',
    marginLeft: -0.75,
    width: 1.5,
  },
  statusNode: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    zIndex: 2,
    marginTop: 28,
  },
  cardCol: {
    flex: 1,
    paddingLeft: 4,
  },
});

export default MoodTimelineSection;
