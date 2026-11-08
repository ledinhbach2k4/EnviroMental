import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { scheduleNextMoodNotification } from '@/utils/notifications';
import {
  MoodEntry,
  CreateMoodEntryPayload,
  fetchMoodEntries,
  createMoodEntry,
} from '../services/moodApi';

export const MAX_LOGS_PER_DAY = 6;
export const LOG_INTERVAL_HOURS = 2;

export interface UseMoodTrackerReturn {
  selectedMood: number | null;
  setSelectedMood: (mood: number | null | ((prev: number | null) => number | null)) => void;
  selectedFactors: string[];
  setSelectedFactors: (factors: string[] | ((prev: string[]) => string[])) => void;
  toggleFactor: (factor: string) => void;
  moodNote: string;
  setMoodNote: (note: string | ((prev: string) => string)) => void;
  isSubmitting: boolean;
  canLog: boolean;
  cooldownReason: 'limit' | 'time' | null;
  todaysLogCount: number;
  lastLogTime: number | null;
  timeToNextLog: string;
  entries: MoodEntry[];
  recentEntries: MoodEntry[];
  saveMoodEntry: () => Promise<boolean>;
  refresh: (force?: boolean) => Promise<void>;
  isRefreshing: boolean;
}

/**
 * Custom React hook encapsulating mood logging state, factors toggle,
 * mood note state, 2-hour interval cooldown countdown, 6-daily limit derived from today's entries,
 * full history array, and deep-link presetMood handling from useLocalSearchParams.
 */
export function useMoodTracker(): UseMoodTrackerReturn {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [moodNote, setMoodNote] = useState<string>('');
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([]);
  const [todaysLogCount, setTodaysLogCount] = useState<number>(0);
  const [lastLogTime, setLastLogTime] = useState<number | null>(null);
  const [timeToNextLog, setTimeToNextLog] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { getToken } = useAuth();
  const router = useRouter();
  const lastFetchedRef = useRef<number>(0);

  // Read presetMood from notification action deep link
  const { presetMood } = useLocalSearchParams<{ presetMood?: string }>();

  // Handle presetMood from deep link via render-phase state adjustment
  const [prevPresetMood, setPrevPresetMood] = useState<string | undefined>(presetMood);
  if (presetMood !== prevPresetMood) {
    setPrevPresetMood(presetMood);
    if (presetMood !== undefined) {
      const parsed = parseInt(presetMood, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
        setSelectedMood((prev) => (prev === null ? parsed : prev));
      }
    }
  }

  // Toggle selection of a factor chip
  const toggleFactor = useCallback((factor: string) => {
    setSelectedFactors((prev) =>
      prev.includes(factor) ? prev.filter((item) => item !== factor) : [...prev, factor]
    );
  }, []);

  // Determine whether the user can log a mood currently
  const canLog =
    todaysLogCount < MAX_LOGS_PER_DAY &&
    (!lastLogTime || (currentTime - lastLogTime) / (1000 * 60 * 60) >= LOG_INTERVAL_HOURS);

  const cooldownReason: 'limit' | 'time' | null =
    todaysLogCount >= MAX_LOGS_PER_DAY ? 'limit' : !canLog ? 'time' : null;

  // Active countdown timer for interval cooldown and daily limits
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      setCurrentTime(now);

      if (todaysLogCount >= MAX_LOGS_PER_DAY) {
        setTimeToNextLog('Daily limit reached (6/6). Log again tomorrow.');
      } else if (lastLogTime) {
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

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [lastLogTime, todaysLogCount]);

  // Load mood data from API with 30s client-side cache throttling
  const refresh = useCallback(
    async (force = false) => {
      if (!getToken) return;

      const now = Date.now();
      if (!force && now - lastFetchedRef.current < 30000) {
        return;
      }

      setIsRefreshing(true);
      try {
        const token = await getToken();
        if (!token) {
          setIsRefreshing(false);
          return;
        }

        const data = await fetchMoodEntries(token);
        const sortedEntries = [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setEntries(sortedEntries);
        setRecentEntries(sortedEntries.slice(0, 10));

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
        console.error('[useMoodTracker] Failed to fetch mood data:', error);
        Alert.alert('Error', 'Could not load mood history.');
      } finally {
        setIsRefreshing(false);
      }
    },
    [getToken]
  );

  // Auto-refresh when screen receives focus
  useFocusEffect(
    useCallback(() => {
      refresh(false);
    }, [refresh])
  );

  // Save the currently composed mood entry
  const saveMoodEntry = useCallback(async (): Promise<boolean> => {
    if (selectedMood === null) {
      Alert.alert('Please select a mood', 'Choose how you are feeling');
      return false;
    }

    if (isSubmitting) return false;

    if (!canLog) {
      if (todaysLogCount >= MAX_LOGS_PER_DAY) {
        Alert.alert(
          'Daily Limit Reached',
          'You have reached the maximum of 6 mood logs for today.'
        );
      } else {
        Alert.alert(
          'Cooldown Active',
          timeToNextLog || 'Please wait 2 hours before logging your next mood.'
        );
      }
      return false;
    }

    setIsSubmitting(true);
    const source = presetMood !== undefined ? 'notification_action' : 'manual';

    const payload: CreateMoodEntryPayload = {
      moodLevel: selectedMood + 1, // Convert 0-4 UI index to 1-5 API scale
      note: moodNote.trim() || undefined,
      factors: selectedFactors,
      source,
    };

    try {
      if (!getToken) throw new Error('Authentication token unavailable');
      const token = await getToken();
      if (!token) throw new Error('Failed to retrieve authentication token');

      await createMoodEntry(token, payload);

      Alert.alert('Mood Saved!', 'Your mood has been recorded.');
      setSelectedMood(null);
      setSelectedFactors([]);
      setMoodNote('');

      await refresh(true);

      // Dynamically schedule notification for the next eligible log time
      const newLogTime = Date.now();
      const newLogCount = todaysLogCount + 1;
      await scheduleNextMoodNotification(newLogTime, newLogCount);

      // Clear presetMood from URL after successful save
      if (presetMood !== undefined) {
        router.replace('/(tabs)/mood');
      }

      return true;
    } catch (error) {
      console.error('[useMoodTracker] Error saving mood:', error);
      Alert.alert('Error', 'Failed to save mood. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedMood,
    isSubmitting,
    canLog,
    todaysLogCount,
    timeToNextLog,
    presetMood,
    moodNote,
    selectedFactors,
    getToken,
    refresh,
    router,
  ]);

  return {
    selectedMood,
    setSelectedMood,
    selectedFactors,
    setSelectedFactors,
    toggleFactor,
    moodNote,
    setMoodNote,
    isSubmitting,
    canLog,
    cooldownReason,
    todaysLogCount,
    lastLogTime,
    timeToNextLog,
    entries,
    recentEntries,
    saveMoodEntry,
    refresh,
    isRefreshing,
  };
}

export default useMoodTracker;
