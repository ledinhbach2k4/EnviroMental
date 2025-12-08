import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../utils/api'; // Using the new axios instance

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

export const useHabits = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn, isLoaded, getToken } = useAuth();

  const isFetchingRef = useRef(false);
  // Use a ref to hold the latest getToken function without causing re-renders
  const tokenRef = useRef(getToken);
  useEffect(() => {
    tokenRef.current = getToken;
  }, [getToken]);

  // useEffect for the initial data load
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isLoaded || !isSignedIn) {
        if (isLoaded && !isSignedIn) {
          setHabits([]);
          setLoading(false);
        }
        return;
      }

      if (isFetchingRef.current) return;

      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const token = await tokenRef.current(); // Use the ref to get the token
        if (!token) {
          throw new Error("Authentication token not available.");
        }

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

        setHabits(processed);
      } catch (err: any) {
        console.error("useHabits useEffect: --- FULL ERROR OBJECT ---");
        console.error(err);
        const errorMessage = err.response?.data?.message || err.message || "An unknown error occurred.";
        setError(errorMessage);
        if (err.response?.status === 401) {
          setError("Authentication token missing or expired. Please try signing in again.");
        }
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };

    fetchInitialData();
  }, [isLoaded, isSignedIn]); // getToken is removed from dependencies

  // Standalone refetch function to be returned by the hook
  const refetch = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setHabits([]);
      return;
    }
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const token = await tokenRef.current(); // Use the ref to get the token
      if (!token) {
        throw new Error("Authentication token not available.");
      }

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

      setHabits(processed);
    } catch (err: any) {
      console.error("useHabits refetch: --- FULL ERROR OBJECT ---");
      console.error(err);
      const errorMessage = err.response?.data?.message || err.message || "An unknown error occurred.";
      setError(errorMessage);
      if (err.response?.status === 401) {
        setError("Authentication token missing or expired. Please try signing in again.");
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isLoaded, isSignedIn]); // getToken is removed from dependencies

  const addHabit = async ({ name, icon }: { name: string; icon: string }) => {
    try {
      const token = await tokenRef.current(); // Use the ref to get the token
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
      const token = await tokenRef.current(); // Use the ref to get the token
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
      const token = await tokenRef.current(); // Use the ref to get the token
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

// This utility function remains the same
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
