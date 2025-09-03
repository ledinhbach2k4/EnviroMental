import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '../constants/api';
import { Ionicons } from '@expo/vector-icons';

// This should match the backend schema, but including UI-specific fields
export interface Habit {
  id: number;
  name: string;
  description: string | null;
  userId: number;
  isActive: boolean;
  createdAt: string;
  // UI-specific fields
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  streak: number; // This will need to be calculated
  completedToday: boolean;
}

export const useHabits = () => {
  const { getToken } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabitsAndLogs = useCallback(async () => {
    console.log("Fetching habits and logs...");
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const [habitsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/habits`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_URL}/habits/logs`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!habitsRes.ok || !logsRes.ok) {
        const habitsErrorText = await habitsRes.text();
        const logsErrorText = await logsRes.text();
        console.error("Habits API response:", habitsRes.status, habitsRes.statusText, habitsErrorText);
        console.error("Logs API response:", logsRes.status, logsRes.statusText, logsErrorText);
        throw new Error(`Failed to fetch data. Habits: ${habitsRes.status} ${habitsRes.statusText} ${habitsErrorText}. Logs: ${logsRes.status} ${logsRes.statusText} ${logsErrorText}`);
      }

      const habitsData = await habitsRes.json();
      const logsData = await logsRes.json();
      
      console.log("Raw habitsData:", habitsData);
      console.log("Raw logsData:", logsData);

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const processedHabits = habitsData.map((habit: any) => {
        const completedToday = logsData.some(
          (log: any) => log.habitId === habit.id && log.logDate.startsWith(today) && log.completed
        );
        
        // TODO: Streak calculation needs historical log data analysis
        const streak = 0; 

        return {
          ...habit,
          // Assign default icon/color, this should ideally come from the DB or a mapping
          icon: 'barbell-outline' as keyof typeof Ionicons.glyphMap,
          color: '#3498db',
          streak,
          completedToday,
        };
      });

      console.log("Processed habits:", processedHabits);
      setHabits(processedHabits);
      console.log("Habits state updated."); // New log
    } catch (e: any) {
      setError(e.message);
      console.error("Failed to fetch habits:", e);
    } finally {
      console.log("Setting loading to false.");
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    console.log("useEffect: Running fetchHabitsAndLogs");
    fetchHabitsAndLogs();

    return () => {
      console.log("useEffect: Cleaning up (component unmounted or dependencies changed)");
    };
  }, [fetchHabitsAndLogs]);

  const addHabit = async (newHabit: { name: string; description?: string }) => {
    try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not found.");

        const response = await fetch(`${API_URL}/habits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(newHabit),
        });
        if (!response.ok) throw new Error('Failed to add habit');
        console.log("Calling fetchHabitsAndLogs after adding habit.");
        await fetchHabitsAndLogs(); // Re-fetch to update the list
        console.log("fetchHabitsAndLogs completed after adding habit.");
    } catch (e: any) {
        setError(e.message);
    }
  };

  const toggleHabitCompletion = async (habitId: number, wasCompletedToday: boolean) => {
    if (wasCompletedToday) {
      console.log("Un-completing a habit is not yet supported by the backend.");
      return;
    }

    try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not found.");

        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_URL}/habits/${habitId}/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ date: today, completed: true }),
        });
        if (!response.ok) throw new Error('Failed to log habit');
        console.log("Calling fetchHabitsAndLogs after toggling habit completion.");
        await fetchHabitsAndLogs(); // Re-fetch to see the change
        console.log("fetchHabitsAndLogs completed after toggling habit completion.");
    } catch (e: any) {
        setError(e.message);
    }
  };

  return { habits, loading, error, refetch: fetchHabitsAndLogs, addHabit, toggleHabitCompletion };
};