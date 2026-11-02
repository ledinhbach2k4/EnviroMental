import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { AnimatedPressable } from '../../components/motion/AnimatedPressable';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { useAuth } from '@clerk/expo';
import { ENV } from '../../constants/api';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { scheduleNextMoodNotification } from '@/utils/notifications';

interface MoodEntry {
  id: string;
  moodLevel: number;
  note: string;
  createdAt: string;
  factors: string[];
}

const moodEmojis = ['😫', '🙁', '😐', '🙂', '😄'];
const moodLabels = ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'];

const moodFactors = ['Weather', 'Sleep', 'Work', 'Exercise', 'Social', 'Food', 'Stress', 'Health'];

const MAX_LOGS_PER_DAY = 6;
const LOG_INTERVAL_HOURS = 2;

function AnimatedBar({
  targetHeight,
  color,
  borderRadius,
}: {
  targetHeight: number;
  color: string;
  borderRadius: number;
}) {
  const heightAnim = useSharedValue(0);

  useEffect(() => {
    heightAnim.value = withTiming(targetHeight, {
      duration: animationTokens.durations.moderate,
    });
  }, [targetHeight, heightAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${heightAnim.value}%`,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 32,
          backgroundColor: color,
          borderRadius,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function MoodTracker() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  const insets = useSafeAreaInsets();

  const moodColors = [
    colors.mood.verySad,
    colors.mood.sad,
    colors.mood.neutral,
    colors.mood.happy,
    colors.mood.veryHappy,
  ];

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [moodNote, setMoodNote] = useState('');
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([]);
  const [todaysLogCount, setTodaysLogCount] = useState(0);
  const [lastLogTime, setLastLogTime] = useState<number | null>(null);
  const [timeToNextLog, setTimeToNextLog] = useState('');
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken } = useAuth();
  const router = useRouter();

  // Read presetMood from notification action deep link
  const { presetMood } = useLocalSearchParams<{ presetMood?: string }>();

  // Handle presetMood from notification action deep link via render-phase state adjustment
  const [prevPresetMood, setPrevPresetMood] = useState(presetMood);
  if (presetMood !== prevPresetMood) {
    setPrevPresetMood(presetMood);
    if (presetMood !== undefined) {
      const parsed = parseInt(presetMood, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
        setSelectedMood((prev) => (prev === null ? parsed : prev));
      }
    }
  }

  const canLogNow = () => {
    if (todaysLogCount >= MAX_LOGS_PER_DAY) {
      return { canLog: false, reason: 'limit' };
    }
    if (lastLogTime) {
      const hoursSinceLastLog = (currentTime - lastLogTime) / (1000 * 60 * 60);
      if (hoursSinceLastLog < LOG_INTERVAL_HOURS) {
        return { canLog: false, reason: 'time' };
      }
    }
    return { canLog: true, reason: null };
  };

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      setCurrentTime(now);
      if (lastLogTime) {
        const nextLogTime = lastLogTime + LOG_INTERVAL_HOURS * 60 * 60 * 1000;
        if (now < nextLogTime) {
          const diffMinutes = Math.ceil((nextLogTime - now) / (1000 * 60));
          setTimeToNextLog(`You can log again in ${diffMinutes} minutes.`);
        } else {
          setTimeToNextLog('');
        }
      } else {
        setTimeToNextLog('');
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [lastLogTime]);

  const loadMoodData = useCallback(
    async (force = false) => {
      if (!getToken) return;

      const now = Date.now();
      if (!force && now - lastFetchedRef.current < 30000) {
        return;
      }

      try {
        const token = await getToken();
        const url = `${ENV.API_URL}/moods`;
        console.log('[MoodTracker] Fetching moods from:', url);
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.warn(`Failed to fetch mood data. Status: ${res.status}, Body: ${errorText}`);
          if (res.status !== 429) Alert.alert('Error', 'Could not load recent mood entries.');
          return;
        }

        const entries: MoodEntry[] = await res.json();
        const sortedEntries = entries.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentEntries(sortedEntries.slice(0, 5));

        const todayString = new Date().toDateString();
        const todaysEntries = sortedEntries.filter(
          (entry) => new Date(entry.createdAt).toDateString() === todayString
        );

        setTodaysLogCount(todaysEntries.length);

        if (todaysEntries.length > 0) {
          setLastLogTime(new Date(todaysEntries[0].createdAt).getTime());
        } else {
          setLastLogTime(null);
        }
        lastFetchedRef.current = now;
      } catch (error) {
        if (error instanceof SyntaxError) {
          console.error('JSON Parse error:', error);
          Alert.alert('Error', 'Received malformed data from the server.');
        } else {
          console.log('Error loading mood data:', error);
          Alert.alert('Error', 'An unexpected error occurred.');
        }
      }
    },
    [getToken]
  );

  const lastFetchedRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      loadMoodData();
    }, [loadMoodData])
  );

  const saveMoodEntry = async () => {
    if (selectedMood === null) {
      Alert.alert('Please select a mood', 'Choose how you are feeling');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);

    // Track if this mood was pre-selected from a notification action
    const source = presetMood !== undefined ? 'notification_action' : 'manual';

    const newEntry = {
      moodLevel: selectedMood + 1, // Convert 0-4 UI index to 1-5 API scale
      note: moodNote,
      factors: selectedFactors,
      source,
    };

    try {
      const token = await getToken();
      const url = `${ENV.API_URL}/moods`;
      console.log('[MoodTracker] Saving mood to:', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEntry),
      });

      if (!res.ok) {
        const errorText = await res.text();
        Alert.alert('Error', `Failed to save mood: ${errorText}`);
        return;
      }

      Alert.alert('Mood Saved!', 'Your mood has been recorded.');
      setSelectedMood(null);
      setSelectedFactors([]);
      setMoodNote('');
      await loadMoodData(true);

      // Dynamically schedule notification for the next eligible mood entry
      const newLogTime = Date.now();
      const newLogCount = todaysLogCount + 1;
      await scheduleNextMoodNotification(newLogTime, newLogCount);

      // Clear presetMood from URL after successful save to allow manual mood selection
      if (presetMood !== undefined) {
        router.replace('/(tabs)/mood');
      }
    } catch (error) {
      console.log('Error saving mood:', error);
      Alert.alert('Error', 'Failed to save your mood entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFactor = (factor: string) => {
    setSelectedFactors((prev) =>
      prev.includes(factor) ? prev.filter((f) => f !== factor) : [...prev, factor]
    );
  };

  const getMoodFrequencies = () => {
    const frequencies = [0, 0, 0, 0, 0];
    recentEntries.forEach((entry) => {
      if (entry.moodLevel >= 1 && entry.moodLevel <= 5) {
        frequencies[entry.moodLevel - 1]++; // Convert 1-5 API scale to 0-4 index
      }
    });
    const maxFrequency = Math.max(...frequencies, 1); // Avoid division by zero
    return { frequencies, maxFrequency };
  };

  const { frequencies, maxFrequency } = getMoodFrequencies();

  const { canLog, reason } = canLogNow();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginVertical: spacing.sm,
      ...shadows.sm,
    },
    cardSmall: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      marginVertical: spacing.xs,
      ...shadows.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    spaceBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
          <Text style={[typography.h1, { color: colors.primary }]}>Mood Tracker 🧠</Text>
          <Text style={typography.bodySmall}>How are you feeling right now?</Text>
        </View>

        <View style={[styles.card, { marginBottom: spacing.xxl }]}>
          <View style={styles.spaceBetween}>
            <Text style={[typography.h3, { marginBottom: spacing.lg }]}>Log Your Mood</Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              {todaysLogCount}/{MAX_LOGS_PER_DAY} logged today
            </Text>
          </View>

          {canLog ? (
            <>
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[typography.body, { marginBottom: spacing.md }]}>
                  How do you feel?
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: spacing.sm,
                  }}
                >
                  {moodEmojis.map((emoji, index) => {
                    const isSelected = selectedMood === index;
                    return (
                      <AnimatedPressable
                        key={index}
                        scaleTo={0.88}
                        springConfig={animationTokens.springs.bouncy}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 30,
                          backgroundColor: isSelected ? moodColors[index] + '30' : colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? moodColors[index] : colors.border,
                        }}
                        onPress={() => setSelectedMood(index)}
                        disabled={isSubmitting}
                      >
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
                {selectedMood !== null && (
                  <Text
                    style={[
                      typography.caption,
                      { textAlign: 'center', color: moodColors[selectedMood] },
                    ]}
                  >
                    {moodLabels[selectedMood]}
                  </Text>
                )}
              </View>

              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[typography.body, { marginBottom: spacing.md }]}>
                  What&apos;s affecting your mood?
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {moodFactors.map((factor) => {
                    const isSelected = selectedFactors.includes(factor);
                    return (
                      <AnimatedPressable
                        key={factor}
                        scaleTo={0.92}
                        springConfig={animationTokens.springs.bouncy}
                        style={{
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.xs,
                          borderRadius: radii.full,
                          backgroundColor: isSelected ? colors.primary + '20' : colors.border,
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : colors.border,
                          marginRight: spacing.sm,
                          marginBottom: spacing.sm,
                        }}
                        onPress={() => toggleFactor(factor)}
                        disabled={isSubmitting}
                      >
                        <Text
                          style={{
                            color: isSelected ? colors.primary : colors.textMuted,
                            fontSize: 14,
                          }}
                        >
                          {factor}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>

              <Button
                text={isSubmitting ? 'Saving...' : 'Save Mood'}
                onPress={saveMoodEntry}
                style={{ backgroundColor: isSubmitting ? colors.primary + '80' : colors.primary }}
                disabled={isSubmitting}
              />
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Icon
                name={reason === 'limit' ? 'checkmark-circle' : 'time'}
                size={40}
                color={colors.primary}
                style={{ marginBottom: spacing.md }}
              />
              <Text style={[typography.h3, { color: colors.primary, marginBottom: spacing.xs }]}>
                {reason === 'limit' ? 'All Done for Today!' : 'A Little Break'}
              </Text>
              <Text style={typography.body}>
                {reason === 'limit'
                  ? 'You&apos;ve reached the maximum of ' + MAX_LOGS_PER_DAY + ' logs for today.'
                  : timeToNextLog}
              </Text>
            </View>
          )}
        </View>

        {recentEntries.length > 0 && (
          <View style={[styles.card, { marginBottom: spacing.xxl }]}>
            <Text style={[typography.h3, { marginBottom: spacing.lg }]}>Your Mood Insights</Text>
            {/* Adjust container height slightly for breathing room */}
            <View
              style={[
                styles.cardSmall,
                {
                  height: 180,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  alignItems: 'flex-end',
                  paddingTop: spacing.md,
                  paddingBottom: spacing.sm,
                },
              ]}
            >
              {moodEmojis.map((emoji, index) => {
                const count = frequencies[index];
                const chartMax = Math.max(maxFrequency * 1.25, 1); // 25% buffer for text labels
                const barHeight = Math.max((count / chartMax) * 100, 5); // 5% min height
                const isMostFrequent = count === maxFrequency && count > 0;

                return (
                  <View key={index} style={{ alignItems: 'center', height: '100%', flex: 1 }}>
                    {/* CHART AREA: flex: 1 ensures it NEVER exceeds available space above the emoji */}
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        width: '100%',
                        paddingBottom: spacing.xs,
                      }}
                    >
                      {count > 0 && (
                        <Text
                          style={[typography.caption, { color: colors.textMuted, marginBottom: 4 }]}
                        >
                          {count}
                        </Text>
                      )}
                      <AnimatedBar
                        targetHeight={barHeight}
                        color={isMostFrequent ? moodColors[index] : moodColors[index] + '50'}
                        borderRadius={radii.sm}
                      />
                    </View>

                    {/* EMOJI AREA: Fixed at the bottom */}
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {recentEntries.length > 0 && (
          <View style={[styles.card, { marginBottom: spacing.xxl }]}>
            <Text style={[typography.h3, { marginBottom: spacing.lg }]}>Recent Entries</Text>
            {recentEntries.map((entry) => (
              <View key={entry.id} style={[styles.cardSmall, { marginBottom: spacing.sm }]}>
                <View style={styles.spaceBetween}>
                  <View>
                    <View style={[styles.row, { marginBottom: spacing.xs }]}>
                      <Text style={{ fontSize: 20, marginRight: spacing.sm }}>
                        {moodEmojis[entry.moodLevel - 1]}
                      </Text>
                      <Text style={typography.body}>{moodLabels[entry.moodLevel - 1]}</Text>
                    </View>
                    <Text style={typography.caption}>
                      {new Date(entry.createdAt).toLocaleString([], {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {entry.factors && entry.factors.length > 0 && (
                      <Text style={[typography.caption, { marginTop: spacing.xs }]}>
                        Factors: {entry.factors.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <LinearGradient
          colors={[colors.primary + '20', colors.secondary + '20']}
          style={[styles.card, { marginBottom: spacing.xxl }]}
        >
          <Icon name="bulb" size={24} color={colors.primary} style={{ marginBottom: spacing.sm }} />
          <Text style={[typography.h3, { marginBottom: spacing.sm }]}>Mood Tip</Text>
          <Text style={typography.body}>
            Logging your mood multiple times a day can provide deeper insights into how it
            fluctuates.
          </Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}
