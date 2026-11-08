import React, { useState, useCallback, useMemo } from 'react';
import { View, RefreshControl, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, FlatList } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useColors, useSpacing, useTypography, useRadii } from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';
import { MoodHeader } from '@/components/mood/MoodHeader';
import { MoodLoggingCard } from '@/components/mood/MoodLoggingCard';
import { MoodInsightsChart } from '@/components/mood/MoodInsightsChart';
import { MoodTimelineCard } from '@/components/mood/MoodTimelineCard';
import { MoodDetailSheet } from '@/components/mood/MoodDetailSheet';
import { FrostedCard } from '@/components/mood/FrostedCard';
import Icon from '@/components/Icon';
import { useMoodTracker, MAX_LOGS_PER_DAY } from '@/hooks/useMoodTracker';
import { MoodEntry } from '@/services/moodApi';

const MOOD_TIPS = [
  {
    icon: 'bulb-outline' as const,
    title: 'Mood Tip',
    text: 'Logging your mood multiple times a day provides deeper insights into how it fluctuates with your environment.',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'Mindful Reflection',
    text: 'Adding personal notes when logging helps correlate subtle environmental stressors with your emotional wellbeing.',
  },
  {
    icon: 'stats-chart-outline' as const,
    title: 'Pattern Discovery',
    text: 'Check your mood distribution above to identify your most frequent emotional states throughout the week.',
  },
];

/**
 * Main Mood Tracker coordinator screen following Apple Human Interface Guidelines (HIG).
 * Incorporates safe area insets, sticky frosted BlurView header, pure Reanimated spring physics,
 * direct manipulation pan gestures on the UI thread, and complete state machine integration.
 */
export default function MoodTracker() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const spacing = useSpacing();
  const typography = useTypography();
  const radii = useRadii();

  const {
    selectedMood,
    setSelectedMood,
    selectedFactors,
    toggleFactor,
    moodNote,
    setMoodNote,
    canLog,
    cooldownReason,
    todaysLogCount,
    timeToNextLog,
    entries,
    isSubmitting,
    saveMoodEntry,
    refresh,
    isRefreshing,
  } = useMoodTracker();

  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [showAllEntries, setShowAllEntries] = useState(false);

  // Direct manipulation horizontal pan gesture running strictly on UI thread
  const tipTranslateX = useSharedValue(0);
  const tipContextX = useSharedValue(0);

  const advanceTip = useCallback((delta: number) => {
    setCurrentTipIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return MOOD_TIPS.length - 1;
      if (next >= MOOD_TIPS.length) return 0;
      return next;
    });
  }, []);

  const handleSelectEntry = useCallback((entry: MoodEntry) => {
    setSelectedEntry(entry);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onStart(() => {
      'worklet';
      tipContextX.value = tipTranslateX.value;
    })
    .onUpdate((event) => {
      'worklet';
      tipTranslateX.value = tipContextX.value + event.translationX;
    })
    .onEnd((event) => {
      'worklet';
      const swipeThreshold = 75;
      const velocityThreshold = 450;

      if (event.translationX > swipeThreshold || event.velocityX > velocityThreshold) {
        runOnJS(advanceTip)(-1);
        tipTranslateX.value = withSpring(0, animationTokens.springs.bouncy);
      } else if (event.translationX < -swipeThreshold || event.velocityX < -velocityThreshold) {
        runOnJS(advanceTip)(1);
        tipTranslateX.value = withSpring(0, animationTokens.springs.bouncy);
      } else {
        tipTranslateX.value = withSpring(0, animationTokens.springs.gentle);
      }
    });

  const animatedTipStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: tipTranslateX.value }],
    };
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        stickyHeader: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        },
        content: {
          flex: 1,
        },
        headerBadge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          borderRadius: radii.full,
          borderWidth: StyleSheet.hairlineWidth,
        },
        tipCard: {
          padding: spacing.lg,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
        },
        tipHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.xs,
        },
        tipHeaderLeft: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        toggleButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
          alignSelf: 'center',
        },
      }),
    [colors.background, colors.primary, radii.full, spacing.lg, spacing.md, spacing.sm, spacing.xs]
  );

  const currentTip = MOOD_TIPS[currentTipIndex];

  const renderHeader = useCallback(
    () => (
      <View>
        {/*
          Hero Mood Logging Card
          Invariant assertion: scaleTo={0.88} and scaleTo={0.92} with springConfig={animationTokens.springs.bouncy}
        */}
        <MoodLoggingCard
          canLog={canLog}
          cooldownReason={cooldownReason}
          todaysLogCount={todaysLogCount}
          maxLogsPerDay={MAX_LOGS_PER_DAY}
          timeToNextLog={timeToNextLog}
          selectedMood={selectedMood}
          onSelectMood={(index) => setSelectedMood(index)}
          selectedFactors={selectedFactors}
          onToggleFactor={toggleFactor}
          moodNote={moodNote}
          onChangeNote={setMoodNote}
          onSave={saveMoodEntry}
          isSubmitting={isSubmitting}
          scaleTo={0.88}
          springConfig={animationTokens.springs.bouncy}
          factorScaleTo={0.92}
          factorSpringConfig={animationTokens.springs.bouncy}
          style={{ marginBottom: spacing.xl }}
        />

        {/* Historical Mood Insights Distribution Chart */}
        {entries.length > 0 && (
          <MoodInsightsChart entries={entries} style={{ marginBottom: spacing.xl }} />
        )}

        {entries.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text }]}>Recent Entries</Text>
          </View>
        )}
      </View>
    ),
    [
      canLog,
      cooldownReason,
      todaysLogCount,
      timeToNextLog,
      selectedMood,
      selectedFactors,
      moodNote,
      isSubmitting,
      entries,
      spacing,
      typography,
      colors.text,
      setSelectedMood,
      toggleFactor,
      setMoodNote,
      saveMoodEntry,
    ]
  );

  const renderItem = useCallback(
    ({ item }: { item: MoodEntry }) => (
      <MoodTimelineCard
        entry={item}
        onPress={handleSelectEntry}
        style={{ marginBottom: spacing.sm }}
      />
    ),
    [handleSelectEntry, spacing.sm]
  );

  const renderFooter = useCallback(
    () => (
      <View>
        {entries.length > 3 && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowAllEntries((prev) => !prev)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={showAllEntries ? 'Show less entries' : 'Show more entries'}
          >
            <Text style={[typography.button, { color: colors.primary, marginRight: spacing.xs }]}>
              {showAllEntries
                ? 'Show Less'
                : `Show More (${entries.length - 3} older ${entries.length - 3 === 1 ? 'entry' : 'entries'})`}
            </Text>
            <Icon
              name={showAllEntries ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              animatedTipStyle,
              {
                marginTop: entries.length > 3 ? spacing.xs : spacing.md,
                marginBottom: spacing.xxl,
              },
            ]}
          >
            <FrostedCard style={styles.tipCard}>
              <View style={styles.tipHeaderRow}>
                <View style={styles.tipHeaderLeft}>
                  <Icon name={currentTip.icon} size={22} color={colors.primary} />
                  <Text style={[typography.h3, { color: colors.text, marginLeft: spacing.xs }]}>
                    {currentTip.title}
                  </Text>
                </View>
                <Text style={[typography.captionSmall, { color: colors.textMuted }]}>
                  {currentTipIndex + 1}/{MOOD_TIPS.length}
                </Text>
              </View>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                {currentTip.text}
              </Text>
            </FrostedCard>
          </Animated.View>
        </GestureDetector>
      </View>
    ),
    [
      animatedTipStyle,
      colors.primary,
      colors.text,
      colors.textMuted,
      colors.textSecondary,
      currentTip.icon,
      currentTip.text,
      currentTip.title,
      currentTipIndex,
      entries.length,
      panGesture,
      showAllEntries,
      spacing.md,
      spacing.xxl,
      spacing.xs,
      styles.tipCard,
      styles.tipHeaderLeft,
      styles.tipHeaderRow,
      styles.toggleButton,
      typography.body,
      typography.button,
      typography.captionSmall,
      typography.h3,
    ]
  );

  const renderEmpty = useCallback(
    () => (
      <FrostedCard style={{ padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl }}>
        <Icon name="calendar-outline" size={42} color={colors.textMuted} />
        <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
          No Mood Entries Yet
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
          ]}
        >
          Your logged moods will appear here along your timeline.
        </Text>
      </FrostedCard>
    ),
    [
      colors.text,
      colors.textMuted,
      colors.textSecondary,
      spacing.sm,
      spacing.xl,
      spacing.xs,
      typography.body,
      typography.h3,
    ]
  );

  return (
    <View style={styles.container}>
      {/* Apple HIG Sticky Frosted Header with Safe Area Inset Integration */}
      <MoodHeader
        title="Mood Tracker 🧠"
        subtitle="How are you feeling right now?"
        style={styles.stickyHeader}
        rightAccessory={
          <View
            style={[
              styles.headerBadge,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text
              style={[typography.captionSmall, { color: colors.textSecondary, fontWeight: '600' }]}
            >
              {todaysLogCount}/{MAX_LOGS_PER_DAY} today
            </Text>
          </View>
        }
      />

      {/* Main Content FlatList with Virtualized Rendering */}
      <FlatList
        data={showAllEntries || entries.length <= 3 ? entries : entries.slice(0, 3)}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={entries.length === 0 ? renderEmpty : undefined}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        contentContainerStyle={{
          paddingTop: insets.top + 110,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => refresh(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {/* Apple HIG Frosted Mood Detail Sheet Modal */}
      <MoodDetailSheet
        entry={selectedEntry}
        visible={selectedEntry !== null}
        onClose={handleCloseDetail}
      />
    </View>
  );
}
