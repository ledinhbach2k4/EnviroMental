import { useAuth } from '@clerk/clerk-expo';
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

  useEffect(() => { tokenRef.current = getToken; }, [getToken]);
  useEffect(() => { isLoadedRef.current = isLoaded; }, [isLoaded]);
  useEffect(() => { isSignedInRef.current = isSignedIn; }, [isSignedIn]);

  // STABLE FETCH FUNCTION - empty deps, uses module-level cache
  const fetchHabits = useCallback(async (force = false) => {
    if (!isLoadedRef.current || !isSignedInRef.current) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const now = Date.now();

    // 1. SERVE FROM CACHE if valid (60s TTL)
    if (!force && cachedHabitsData && now - lastHabitsFetch < 60000) {
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
    setLoading(true);
    setError(null);

    try {
      const token = await tokenRef.current();
      if (!token) throw new Error("Authentication token not available.");

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [habitsRes, logsRes] = await Promise.all([
        api.get('/habits', config),
        api.get('/habits/logs', config),
      ]);

      const habitsData = habitsRes.data;
      const logsData = logsRes.data;
      const today = new Date().toISOString().split('T')[0];

      const processed: Habit[] = habitsData
        .filter((h: any) => h.userId !== null)
        .map((h: any) => {
          const todayLog = logsData.find((l: any) => l.habitId === h.id && l.logDate === today);
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
      console.error("useHabits fetch:", err);
      const errorMessage = err.response?.data?.message || err.message || "An unknown error occurred.";
      setError(errorMessage);
      if (err.response?.status === 401) {
        setError("Authentication token missing or expired. Please try signing in again.");
      }
      setHabits([]);
    } finally {
      setLoading(false);
      isFetchingHabits = false;
    }
  }, []); // STRICTLY EMPTY DEPS

  // SINGLE MOUNT EFFECT - RUNS ONCE
  useEffect(() => {
    fetchHabits();
  }, []); // STRICTLY EMPTY ARRAY

  // STABLE REFETCH - bypasses cache
  const refetch = useCallback(async () => {
    await fetchHabits(true);
  }, [fetchHabits]);

  const addHabit = async ({ name, icon }: { name: string; icon: string }) => {
    try {
      const token = await tokenRef.current();
      if (!token) throw new Error("Not authenticated");
      await api.post('/habits', { name, icon }, { headers: { Authorization: `Bearer ${token}` } });
      await refetch();
    } catch (err: any) {
      console.error('useHabits: Error adding habit:', err);
      setError(err.message);
    }
  };

  const toggleHabitCompletion = async (habitId: number, currentCompleted: boolean) => {
    const originalHabits = [...habits];
    setHabits(prevHabits =>
      prevHabits.map(habit =>
        habit.id === habitId ? { ...habit, completedToday: !currentCompleted } : habit
      )
    );

    try {
      const token = await tokenRef.current();
      if (!token) throw new Error("Not authenticated");
      const today = new Date().toISOString().split('T')[0];
      await api.post(
        `/habits/${habitId}/log`,
        { date: today, completed: !currentCompleted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refetch();
    } catch (err: any) {
      console.error(`useHabits: Error toggling habitId ${habitId}:`, err);
      setError(err.message);
      setHabits(originalHabits);
      throw err;
    }
  };

  const deleteMultipleHabits = async (habitIds: number[]) => {
    const originalHabits = [...habits];
    setHabits(prevHabits => prevHabits.filter(habit => !habitIds.includes(habit.id)));

    try {
      const token = await tokenRef.current();
      if (!token) throw new Error("Not authenticated");
      const deletePromises = habitIds.map(id =>
        api.delete(`/habits/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      );
      await Promise.all(deletePromises);
    } catch (err: any) {
      console.error(`useHabits: Error deleting multiple habits:`, err);
      setError(err.message);
      setHabits(originalHabits);
      throw err;
    }
  };

  const deleteAllHabits = async () => {
    const allHabitIds = habits.map(h => h.id);
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
    deleteMultipleHabits,
    deleteAllHabits,
  };
};

function calculateStreak(habitId: number, logs: any[]): number {
  const habitLogs = logs
    .filter((l: any) => l.habitId === habitId && l.completed)
    .sort((a: any, b: any) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());

  if (habitLogs.length === 0) return 0;

  let streak = 1;
  let lastDate = new Date(habitLogs[0].logDate);
  lastDate.setUTCHours(0, 0, 0, 0);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const timeDiff = today.getTime() - lastDate.getTime();

  if (timeDiff > 86400000) {
    return 0;
  }

  for (let i = 1; i < habitLogs.length; i++) {
    const logDate = new Date(habitLogs[i].logDate);
    logDate.setUTCHours(0, 0, 0, 0);

    if (lastDate.getTime() - logDate.getTime() === 86400000) {
      streak++;
      lastDate = logDate;
    } else if (lastDate.getTime() - logDate.getTime() > 86400000) {
      break;
    }
  }

  return streak;
}

export { calculateStreak };
export default useHabits;