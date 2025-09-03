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
  const getTokenRef = useRef(getToken);
  const isInitialFetchRef = useRef(true); // Theo dõi fetch đầu tiên

  useEffect(() => {
    getTokenRef.current = getToken; // Update ref when getToken changes
  }, [getToken]);

  const fetchHabitsAndLogs = useCallback(async () => {
    console.log('Fetching habits and logs...');
    setLoading(true);
    try {
      const token = await getTokenRef.current();
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
      isInitialFetchRef.current = false; // Đánh dấu fetch đầu tiên hoàn tất
    }
  }, []);

  useEffect(() => {
    if (isInitialFetchRef.current) {
      console.log('useHabits hook rendered');
      fetchHabitsAndLogs(); // Run only on initial mount
    }
  }, [fetchHabitsAndLogs]);

  const addHabit = async ({ name }: { name: string }) => {
    try {
      const token = await getTokenRef.current();
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
      const token = await getTokenRef.current();
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
      throw err; // Ném lỗi để habits.tsx xử lý
    }
  };

  const refetch = () => fetchHabitsAndLogs();

  return { habits, loading, error, refetch, addHabit, toggleHabitCompletion };
};

function calculateStreak(habitId: number, logs: any[]): number {
  const habitLogs = logs
    .filter((l: any) => l.habitId === habitId && l.completed)
    .sort((a: any, b: any) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());

  if (habitLogs.length === 0) return 0;

  let streak = 0;
  let lastDate = new Date();
  lastDate.setUTCHours(0, 0, 0, 0);

  const todayLogIndex = habitLogs.findIndex((log: any) => {
    const logDate = new Date(log.logDate);
    logDate.setUTCHours(0, 0, 0, 0);
    return logDate.getTime() === lastDate.getTime();
  });

  if (todayLogIndex !== -1) {
    streak = 1;
    lastDate.setDate(lastDate.getDate() - 1);
  } else {
    return 0;
  }

  for (let i = todayLogIndex + 1; i < habitLogs.length; i++) {
    const log = habitLogs[i];
    const logDate = new Date(log.logDate);
    logDate.setUTCHours(0, 0, 0, 0);

    if (logDate.getTime() === lastDate.getTime()) {
      streak++;
      lastDate.setDate(lastDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}