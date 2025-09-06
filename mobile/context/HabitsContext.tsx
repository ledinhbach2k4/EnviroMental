import React, { createContext, useContext } from 'react';
import { useHabits, Habit } from '../hooks/useHabits';

// Define the context shape
interface HabitsContextType {
  habits: Habit[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addHabit: (newHabit: { name: string }) => Promise<void>;
  toggleHabitCompletion: (habitId: number, completed: boolean) => Promise<void>;
  deleteHabit: (habitId: number) => Promise<void>;
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

// Create the provider component
export const HabitsProvider = ({ children }: { children: React.ReactNode }) => {
  const habitsData = useHabits();
  return (
    <HabitsContext.Provider value={habitsData}>
      {children}
    </HabitsContext.Provider>
  );
};

// Create a custom hook to consume the context
export const useSharedHabits = () => {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error('useSharedHabits must be used within a HabitsProvider');
  }
  return context;
};
