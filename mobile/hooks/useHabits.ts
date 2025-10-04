import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { API_URL } from '../constants/api';
import { fetchWithRetry } from '../utils/api';

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

  // Refs to control fetching logic
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const fetchHabitsAndLogs = useCallback(async () => {
    const now = Date.now();
    // Cooldown: Do not fetch if the last fetch was less than 30 seconds ago
    if (now - lastFetchTimeRef.current < 30000) {
      console.log(`[${new Date().toISOString()}] useHabits: fetchHabitsAndLogs: Recently fetched, skipping.`);
      return;
    }
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log(`[${new Date().toISOString()}] useHabits: fetchHabitsAndLogs: Fetch already in progress, skipping.`);
      return;
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now; // Update last fetch time immediately
    console.log(`[${new Date().toISOString()}] useHabits: --- Starting to fetch habits and logs ---`);
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token is missing.");
      }

      const habitsUrl = `${API_URL}/habits`;
      const logsUrl = `${API_URL}/habits/logs`;
      const options = { headers: { Authorization: `Bearer ${token}` } };

      console.log("useHabits: Fetching from:", habitsUrl);
      console.log("useHabits: Fetching from:", logsUrl);

      // Use fetchWithRetry for both requests
      const [habitsRes, logsRes] = await Promise.all([
        fetchWithRetry(habitsUrl, options),
        fetchWithRetry(logsUrl, options),
      ]);

      console.log("useHabits: Habits Response Status:", habitsRes.status);
      console.log("useHabits: Logs Response Status:", logsRes.status);

      // Check if responses are OK after retries
      if (!habitsRes.ok) {
        const body = await habitsRes.text();
        throw new Error(`Failed to fetch habits. Status: ${habitsRes.status}, Body: ${body}`);
      }
      if (!logsRes.ok) {
        const body = await logsRes.text();
        throw new Error(`Failed to fetch logs. Status: ${logsRes.status}, Body: ${body}`);
      }

      const [habitsData, logsData] = await Promise.all([habitsRes.json(), logsRes.json()]);

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

      console.log(`[${new Date().toISOString()}] useHabits: Processed habits before setting state:`, processed);
      setHabits(processed);
    } catch (err: any) {
      console.error("useHabits: --- FULL ERROR OBJECT ---");
      console.error(err);
      setError(err.message || "An unknown error occurred.");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      console.log(`[${new Date().toISOString()}] useHabits: --- Finished fetching habits and logs ---`);
    }
  }, [getToken]);

  // useFocusEffect has been removed from this hook.
  // The component using this hook is now responsible for triggering the refetch on focus.

  const addHabit = async ({ name, icon }: { name: string; icon: string }) => {
    // This function can remain mostly the same, but will trigger the improved fetch
    try {
      const token = await getToken();
      await fetch(`${API_URL}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, icon }),
      });
      lastFetchTimeRef.current = 0; // Reset timer to allow immediate refetch
      await fetchHabitsAndLogs();
    } catch (err: any) {
      console.error('useHabits: Error adding habit:', err);
      setError(err.message);
    }
  };

  const toggleHabitCompletion = async (habitId: number, currentCompleted: boolean) => {
    console.log(`[${new Date().toISOString()}] useHabits: toggleHabitCompletion called for habitId: ${habitId}, currentCompleted: ${currentCompleted}`);
    // Store the original habits state for potential rollback
    const originalHabits = [...habits];

    // Optimistic update: Immediately update the UI
    setHabits(prevHabits => {
      const updated = prevHabits.map(habit =>
        habit.id === habitId
          ? { ...habit, completedToday: !currentCompleted }
          : habit
      );
      console.log(`[${new Date().toISOString()}] useHabits: Optimistic update for habitId: ${habitId}. New completedToday: ${!currentCompleted}`);
      return updated;
    });

    try {
      const token = await getToken();
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: today, completed: !currentCompleted }),
      });

      console.log(`[${new Date().toISOString()}] useHabits: API response for habitId ${habitId}: OK=${response.ok}, Status=${response.status}`);

      if (!response.ok) {
        // If API call fails, revert the optimistic update
        setHabits(originalHabits);
        console.log(`[${new Date().toISOString()}] useHabits: API call failed for habitId ${habitId}. Reverting optimistic update.`);
        throw new Error(`Failed to toggle habit: ${response.statusText}`);
      }

      // API call succeeded, now refetch to get accurate streak and other server-side updates
      lastFetchTimeRef.current = 0; // Reset timer to allow immediate refetch
      console.log(`[${new Date().toISOString()}] useHabits: API call succeeded for habitId ${habitId}. Triggering full refetch.`);
      await fetchHabitsAndLogs();
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] useHabits: Error toggling habitId ${habitId}:`, err);
      setError(err.message);
      // Ensure state is reverted if an error occurs during fetch or processing
      setHabits(originalHabits);
      console.log(`[${new Date().toISOString()}] useHabits: Error caught for habitId ${habitId}. Reverting optimistic update.`);
      throw err;
    }
  };

  const deleteHabit = async (habitId: number) => {
    const originalHabits = [...habits];
    setHabits(prevHabits => prevHabits.filter(habit => habit.id !== habitId));

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/habits/${habitId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setHabits(originalHabits);
        throw new Error(`Failed to delete habit: ${response.statusText}`);
      }
      // No need to refetch, optimistic update is enough
    } catch (err: any) {
      console.error(`useHabits: Error deleting habitId ${habitId}:`, err);
      setError(err.message);
      setHabits(originalHabits);
      throw err;
    }
  };

  const deleteMultipleHabits = async (habitIds: number[]) => {
    const originalHabits = [...habits];
    setHabits(prevHabits => prevHabits.filter(habit => !habitIds.includes(habit.id)));

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token is missing.");

      const deletePromises = habitIds.map(id => 
        fetch(`${API_URL}/habits/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      const results = await Promise.all(deletePromises);
      
      // Check if any of the deletions failed
      if (results.some(res => !res.ok)) {
        // This is a simplified error handling. A more robust solution might
        // try to figure out which ones failed and only revert those.
        throw new Error('One or more habits could not be deleted.');
      }
      
    } catch (err: any) {
      console.error(`useHabits: Error deleting multiple habits:`, err);
      setError(err.message);
      setHabits(originalHabits); // Rollback on error
      throw err;
    }
  };

  const deleteAllHabits = async () => {
    const originalHabits = [...habits];
    const allHabitIds = originalHabits.map(h => h.id);
    setHabits([]);

    try {
      await deleteMultipleHabits(allHabitIds);
    } catch (err: any) {
      console.error(`useHabits: Error deleting all habits:`, err);
      // The error state and rollback is handled by deleteMultipleHabits
      // so we just re-throw the error.
      throw err;
    }
  };

  return { 
    habits, 
    loading, 
    error, 
    refetch: fetchHabitsAndLogs, 
    addHabit, 
    toggleHabitCompletion, 
    deleteHabit,
    deleteMultipleHabits,
    deleteAllHabits
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

  // Check if the most recent log is for today or yesterday
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const timeDiff = today.getTime() - lastDate.getTime();

  if (timeDiff > 86400000) { // More than 1 day has passed since last log
      return 0;
  }

  for (let i = 1; i < habitLogs.length; i++) {
    const logDate = new Date(habitLogs[i].logDate);
    logDate.setUTCHours(0, 0, 0, 0);

    // Check if the next log is exactly one day before the previous one
    if (lastDate.getTime() - logDate.getTime() === 86400000) {
      streak++;
      lastDate = logDate;
    } else if (lastDate.getTime() - logDate.getTime() > 86400000) {
      // A gap was found, stop counting
      break;
    }
  }

  return streak;
}