import { useCallback, useEffect, useState } from 'react';
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
}

export const useHabits = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const fetchHabitsAndLogs = useCallback(async () => {
    console.log('Fetching habits and logs...');
    setLoading(true);
    try {
      const token = await getToken();
      const habitsRes = await fetch(`${API_URL}/habits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!habitsRes.ok) {
        throw new Error(`Failed to fetch habits: ${habitsRes.statusText}`);
      }
      const habitsData = await habitsRes.json();
      console.log('Raw habitsData:', habitsData);

      const logsRes = await fetch(`${API_URL}/habits/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!logsRes.ok) {
        throw new Error(`Failed to fetch habit logs: ${logsRes.statusText}`);
      }
      const logsData = await logsRes.json();
      console.log('Raw logsData:', logsData);

      const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
      const processed: Habit[] = habitsData.map((h: any) => {
        const todayLog = logsData.find((l: any) => l.habitId === h.id && l.logDate === today);
        return {
          ...h,
          completedToday: !!todayLog?.completed,
          streak: calculateStreak(h.id, logsData),
        };
      });

      console.log('Processed habits:', processed);
      setHabits(processed);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching habits:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('Habits state updated.');
      console.log('Setting loading to false.');
    }
  }, []);

  useEffect(() => {
    console.log('useHabits hook rendered');
    fetchHabitsAndLogs();
    return () => {
      console.log('useEffect: Cleaning up');
    };
  }, [fetchHabitsAndLogs]);

  const addHabit = async ({ name }: { name: string }) => {
    try {
      const token = await getToken();
      await fetch(`${API_URL}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      await fetchHabitsAndLogs(); // Refresh after add
    } catch (err: any) {
      console.error('Error adding habit:', err);
      setError(err.message);
    }
  };

  const toggleHabitCompletion = async (habitId: number, currentCompleted: boolean) => {
    try {
      const token = await getToken();
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_URL}/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: today, completed: !currentCompleted }),
      });
      await fetchHabitsAndLogs(); // Refresh after toggle
    } catch (err: any) {
      console.error('Error toggling habit:', err);
      setError(err.message);
    }
  };

  const refetch = () => fetchHabitsAndLogs();

  return { habits, loading, error, refetch, addHabit, toggleHabitCompletion };
};

function calculateStreak(habitId: number, logs: any[]): number {
  const habitLogs = logs
    .filter(l => l.habitId === habitId && l.completed)
    .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());

  if (habitLogs.length === 0) return 0;

  let streak = 0;
  let lastDate = new Date();
  lastDate.setUTCHours(0, 0, 0, 0);

  // Check for today's completion first
  const todayLogIndex = habitLogs.findIndex(log => {
    const logDate = new Date(log.logDate);
    logDate.setUTCHours(0, 0, 0, 0);
    return logDate.getTime() === lastDate.getTime();
  });

  if (todayLogIndex === -1) {
    // If not completed today, check if it was completed yesterday
    lastDate.setDate(lastDate.getDate() - 1);
    const yesterdayLogIndex = habitLogs.findIndex(log => {
        const logDate = new Date(log.logDate);
        logDate.setUTCHours(0, 0, 0, 0);
        return logDate.getTime() === lastDate.getTime();
    });
    if (yesterdayLogIndex === -1) return 0; // No streak if not completed yesterday either
    streak = 1;
    lastDate.setDate(lastDate.getDate() - 1);
  } else {
    streak = 1;
    lastDate.setDate(lastDate.getDate() - 1);
  }

  for (let i = 0; i < habitLogs.length; i++) {
    const log = habitLogs[i];
    const logDate = new Date(log.logDate);
    logDate.setUTCHours(0, 0, 0, 0);

    if (logDate.getTime() === lastDate.getTime()) {
      streak++;
      lastDate.setDate(lastDate.getDate() - 1);
    } else if (logDate.getTime() < lastDate.getTime()) {
        // A gap in dates, so streak is broken
        break;
    }
  }

  return streak;
}