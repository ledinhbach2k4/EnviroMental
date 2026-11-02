import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../utils/api';

export interface Habit {
  id: number;
  name: string;
  description?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  completedToday: boolean;
  streak: number;
  userId?: number | null;
}

/**
 * Returns a date string formatted as 'YYYY-MM-DD' in the user's local timezone.
 */
export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Normalizes any date value (Date object, ISO string, or YYYY-MM-DD) into 'YYYY-MM-DD'.
 */
export const normalizeDateString = (rawDate: any): string => {
  if (!rawDate) return '';
  if (typeof rawDate === 'string') {
    return rawDate.split('T')[0];
  }
  if (rawDate instanceof Date) {
    return getLocalDateString(rawDate);
  }
  return String(rawDate).split('T')[0];
};

/**
 * Calculates the current consecutive active day streak for a habit.
 * - Handles active streaks from yesterday (doesn't prematurely reset to 0 in the morning).
 * - Correctly counts backwards across consecutive calendar days.
 * - Deduplicates multiple logs on the same date.
 * - Immune to timezone shifts and DST transitions.
 */
export function calculateStreak(
  habitId: number,
  logs: any[],
  referenceDate: Date = new Date()
): number {
  if (!Array.isArray(logs) || logs.length === 0) return 0;

  // Filter logs for this specific habit
  const habitLogs = logs.filter((l: any) => l && l.habitId === habitId);
  if (habitLogs.length === 0) return 0;

  // Deduplicate by date: map date string -> boolean (completed)
  // If multiple records exist for a single date, the latest record or true status takes precedence
  const dateMap = new Map<string, boolean>();
  for (const log of habitLogs) {
    const dStr = normalizeDateString(log.logDate);
    if (!dStr) continue;
    // If not yet set, or if existing was false and this one is true, set it
    if (!dateMap.has(dStr) || log.completed) {
      dateMap.set(dStr, Boolean(log.completed));
    }
  }

  // Calculate day index for referenceDate in local time
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();
  const todayDayIndex = Math.floor(Date.UTC(refYear, refMonth, refDay) / 86400000);

  // Collect day indices for all completed dates
  const completedDayIndices = new Set<number>();
  dateMap.forEach((completed, dStr) => {
    if (!completed) return;
    const parts = dStr.split('-').map(Number);
    if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const dayIndex = Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
      completedDayIndices.add(dayIndex);
    }
  });

  if (completedDayIndices.size === 0) return 0;

  const isTodayCompleted = completedDayIndices.has(todayDayIndex);
  const isYesterdayCompleted = completedDayIndices.has(todayDayIndex - 1);

  // If neither today nor yesterday is completed, the streak has lapsed
  if (!isTodayCompleted && !isYesterdayCompleted) {
    return 0;
  }

  // Count consecutive days backwards
  let streak = 0;
  let checkDay = isTodayCompleted ? todayDayIndex : todayDayIndex - 1;

  while (completedDayIndices.has(checkDay)) {
    streak++;
    checkDay--;
  }

  return streak;
}

// MODULE-LEVEL CACHE - persists across all component lifecycles
let cachedHabitsData: Habit[] | null = null;
let lastHabitsFetch = 0;
let isFetchingHabits = false;
const HABITS_CACHE_TTL = 60000; // 60 seconds

export const useHabits = () => {
  const [habits, setHabits] = useState<Habit[]>(cachedHabitsData || []);
  const [loading, setLoading] = useState(!cachedHabitsData);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const tokenRef = useRef(getToken);
  const isLoadedRef = useRef(isLoaded);
  const isSignedInRef = useRef(isSignedIn);
  const inFlightTogglesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    tokenRef.current = getToken;
  }, [getToken]);
  useEffect(() => {
    isLoadedRef.current = isLoaded;
  }, [isLoaded]);
  useEffect(() => {
    isSignedInRef.current = isSignedIn;
  }, [isSignedIn]);

  // STABLE FETCH FUNCTION - empty deps, uses module-level cache
  const fetchHabits = useCallback(async (force = false) => {
    if (!isLoadedRef.current || !isSignedInRef.current) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const now = Date.now();

    // 1. SERVE FROM CACHE if valid (60s TTL)
    if (!force && cachedHabitsData && now - lastHabitsFetch < HABITS_CACHE_TTL) {
      setHabits(cachedHabitsData);
      setLoading(false);
      return;
    }

    // 2. DEDUPLICATION - prevent concurrent fetches
    if (isFetchingHabits) {
      return;
    }

    // 3. MARK AS FETCHING
    isFetchingHabits = true;
    if (!cachedHabitsData) {
      setLoading(true);
    }
    setError(null);

    try {
      const token = await tokenRef.current();
      if (!token) throw new Error('Authentication token not available.');

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [habitsRes, logsRes] = await Promise.all([
        api.get('/habits', config),
        api.get('/habits/logs', config),
      ]);

      const habitsData = habitsRes.data;
      const logsData = logsRes.data;
      const today = getLocalDateString();

      const processed: Habit[] = habitsData
        .filter((h: any) => h.userId !== null)
        .map((h: any) => {
          const matchingTodayLogs = Array.isArray(logsData)
            ? logsData.filter(
                (l: any) => l.habitId === h.id && normalizeDateString(l.logDate) === today
              )
            : [];
          const todayLog = matchingTodayLogs.length > 0 ? matchingTodayLogs[0] : undefined;

          return {
            ...h,
            icon: h.icon || 'happy-outline',
            color: h.color || '#FF6347',
            completedToday: !!todayLog?.completed,
            streak: calculateStreak(h.id, logsData),
          };
        });

      // UPDATE CACHE
      cachedHabitsData = processed;
      lastHabitsFetch = Date.now();
      setHabits(processed);
    } catch (err: any) {
      console.error('useHabits fetch:', err);
      const errorMessage =
        err.response?.data?.message || err.message || 'An unknown error occurred.';
      setError(errorMessage);
      if (err.response?.status === 401) {
        setError('Authentication token missing or expired. Please try signing in again.');
      }
      setHabits([]);
    } finally {
      setLoading(false);
      isFetchingHabits = false;
    }
  }, []);

  // SINGLE MOUNT EFFECT - RUNS ONCE
  useEffect(() => {
    let isMounted = true;
    void Promise.resolve().then(() => {
      if (isMounted) fetchHabits();
    });
    return () => {
      isMounted = false;
    };
  }, [fetchHabits]);

  // STABLE REFETCH - respects cache unless force is specified
  const refetch = useCallback(
    async (force = false) => {
      await fetchHabits(force);
    },
    [fetchHabits]
  );

  const addHabit = async ({ name, icon }: { name: string; icon: string }) => {
    try {
      const token = await tokenRef.current();
      if (!token) throw new Error('Not authenticated');
      await api.post('/habits', { name, icon }, { headers: { Authorization: `Bearer ${token}` } });
      await refetch(true);
    } catch (err: any) {
      console.error('useHabits: Error adding habit:', err);
      setError(err.message);
    }
  };

  const toggleHabitCompletion = async (habitId: number, currentCompleted: boolean) => {
    // Prevent duplicate concurrent requests for the exact same habit
    if (inFlightTogglesRef.current.has(habitId)) {
      return;
    }
    inFlightTogglesRef.current.add(habitId);

    const originalHabits = [...habits];
    const newCompleted = !currentCompleted;

    // Optimistically update habits list
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id !== habitId) return habit;
        const streakDelta = newCompleted ? 1 : -1;
        const optimisticStreak = Math.max(0, habit.streak + streakDelta);
        return {
          ...habit,
          completedToday: newCompleted,
          streak: optimisticStreak,
        };
      })
    );

    try {
      const token = await tokenRef.current();
      if (!token) throw new Error('Not authenticated');
      const today = getLocalDateString();
      await api.post(
        `/habits/${habitId}/log`,
        { date: today, completed: newCompleted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchHabits(true);
    } catch (err: any) {
      console.error(`useHabits: Error toggling habitId ${habitId}:`, err);
      setError(err.message);
      setHabits(originalHabits);
      throw err;
    } finally {
      inFlightTogglesRef.current.delete(habitId);
    }
  };

  const deleteMultipleHabits = async (habitIds: number[]) => {
    const originalHabits = [...habits];
    setHabits((prevHabits) => prevHabits.filter((habit) => !habitIds.includes(habit.id)));

    try {
      const token = await tokenRef.current();
      if (!token) throw new Error('Not authenticated');
      const deletePromises = habitIds.map((id) =>
        api.delete(`/habits/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      );
      await Promise.all(deletePromises);
      await refetch(true);
    } catch (err: any) {
      console.error(`useHabits: Error deleting multiple habits:`, err);
      setError(err.message);
      setHabits(originalHabits);
      throw err;
    }
  };

  const deleteHabit = async (habitId: number) => {
    return deleteMultipleHabits([habitId]);
  };

  const deleteAllHabits = async () => {
    const allHabitIds = habits.map((h) => h.id);
    try {
      await deleteMultipleHabits(allHabitIds);
    } catch (err: any) {
      console.error(`useHabits: Error deleting all habits:`, err);
      throw err;
    }
  };

  return {
    habits,
    loading,
    error,
    refetch,
    addHabit,
    toggleHabitCompletion,
    deleteHabit,
    deleteMultipleHabits,
    deleteAllHabits,
  };
};

export default useHabits;
