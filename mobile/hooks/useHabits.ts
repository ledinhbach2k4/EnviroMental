import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/api';

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
  const { getToken } = useAuth();
  const isFetchingRef = useRef(false); // Prevent concurrent fetches

  const fetchHabitsAndLogs = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    console.log('Fetching habits and logs...');
    setLoading(true);
    try {
      const token = await getToken(); // Use getToken directly
      if (!token) {
        console.log('No token found, skipping fetch');
        setLoading(false);
        return;
      }
      const [habitsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/habits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/habits/logs`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!habitsRes.ok) throw new Error(`Failed to fetch habits: ${habitsRes.statusText}`);
      if (!logsRes.ok) throw new Error(`Failed to fetch habit logs: ${logsRes.statusText}`);
      const [habitsData, logsData] = await Promise.all([habitsRes.json(), logsRes.json()]);
      console.log('Raw habitsData:', habitsData);
      console.log('Raw logsData:', logsData);

      const today = new Date().toISOString().split('T')[0];
      const processed: Habit[] = habitsData
        .filter((h: any) => h.userId !== null)
        .map((h: any) => {
          const todayLog = logsData.find((l: any) => l.habitId === h.id && l.logDate === today);
          return {
            ...h,
            icon: h.icon || 'happy-outline', // Default icon
            color: h.color || '#FF6347', // Default color
            completedToday: !!todayLog?.completed,
            streak: calculateStreak(h.id, logsData),
          };
        });

      console.log('Processed habits:', processed);
      setHabits(processed); // Always set habits with fresh data
      setError(null);
    } catch (err: any) {
      console.error('Error fetching habits:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Habits state updated.');
      console.log('Setting loading to false.');
      isFetchingRef.current = false;
    }
  }, [getToken]); // Only getToken is a dependency now

  useEffect(() => {
    fetchHabitsAndLogs(); // Call once on mount
  }, [fetchHabitsAndLogs]); // fetchHabitsAndLogs is stable due to useCallback and its dependencies

  const addHabit = async ({ name }: { name: string }) => {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      await fetchHabitsAndLogs();
    } catch (err: any) {
      console.error('Error adding habit:', err);
      setError(err.message);
    }
  };

  const toggleHabitCompletion = async (habitId: number, currentCompleted: boolean) => {
    try {
      const token = await getToken();
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: today, completed: !currentCompleted }),
      });
      if (!response.ok) throw new Error(`Failed to toggle habit: ${response.statusText}`);
      await fetchHabitsAndLogs();
    } catch (err: any) {
      console.error('Error toggling habit:', err);
      setError(err.message);
      throw err;
    }
  };

  const refetch = async () => {
    await fetchHabitsAndLogs();
  };

  return { habits, loading, error, refetch, addHabit, toggleHabitCompletion };
};

function calculateStreak(habitId: number, logs: any[]): number {
  const habitLogs = logs
    .filter((l: any) => l.habitId === habitId && l.completed)
    .sort((a: any, b: any) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());

  if (habitLogs.length === 0) return 0;

  let streak = 1;
  let lastDate = new Date(habitLogs[0].logDate);
  lastDate.setUTCHours(0, 0, 0, 0);

  for (let i = 1; i < habitLogs.length; i++) {
    const logDate = new Date(habitLogs[i].logDate);
    logDate.setUTCHours(0, 0, 0, 0);

    if (lastDate.getTime() - logDate.getTime() === 86400000) {
      streak++;
      lastDate = logDate;
    } else {
      break;
    }
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (lastDate.getTime() < today.getTime() - 86400000) {
    return 0;
  } else if (lastDate.getTime() === today.getTime()) {
    return streak;
  } else {
    // Yesterday completed, keep streak but not add today yet
    return streak;
  }
}