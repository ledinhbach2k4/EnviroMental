import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, textStyles, colors } from '../../assets/styles/commonStyles';
import Icon from '../../components/Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  streak: number;
  completedToday: boolean;
  completedDates: string[];
}

const defaultHabits: Omit<Habit, 'id' | 'streak' | 'completedToday' | 'completedDates'>[] = [
  { name: 'Drink 8 glasses of water', icon: 'water', color: colors.primary },
  { name: 'Exercise for 30 minutes', icon: 'fitness', color: colors.success },
  { name: 'Meditate for 10 minutes', icon: 'leaf', color: colors.secondary },
  { name: 'Get 8 hours of sleep', icon: 'moon', color: colors.accent },
  { name: 'Write in journal', icon: 'book', color: colors.warning },
];

export default function HabitsTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const stored = await AsyncStorage.getItem('habits');
      console.log('Stored data:', stored);
      if (stored) {
        const storedHabits = JSON.parse(stored);
        // Check if habits need to be reset for new day
        const today = new Date().toDateString();
        const updatedHabits = storedHabits.map((habit: Habit) => ({
          ...habit,
          completedToday: habit.completedDates.includes(today),
        }));
        setHabits(updatedHabits);
      } else {
        // Initialize with default habits
        const initialHabits = defaultHabits.map((habit, index) => ({
          ...habit,
          id: index.toString(),
          streak: 0,
          completedToday: false,
          completedDates: [],
        }));
        setHabits(initialHabits);
        await AsyncStorage.setItem('habits', JSON.stringify(initialHabits));
      }
    } catch (error) {
      console.log('Error loading habits:', error);
    }
  };

  const toggleHabit = async (habitId: string) => {
    const today = new Date().toDateString();
    
    const updatedHabits = habits.map(habit => {
      if (habit.id === habitId) {
        const isCompleting = !habit.completedToday;
        let newCompletedDates = [...habit.completedDates];
        let newStreak = habit.streak;

        if (isCompleting) {
          if (!newCompletedDates.includes(today)) {
            newCompletedDates.push(today);
            newStreak += 1;
          }
        } else {
          newCompletedDates = newCompletedDates.filter(date => date !== today);
          newStreak = Math.max(0, newStreak - 1);
        }

        return {
          ...habit,
          completedToday: isCompleting,
          completedDates: newCompletedDates,
          streak: newStreak,
        };
      }
      return habit;
    });

    setHabits(updatedHabits);
    
    try {
      await AsyncStorage.setItem('habits', JSON.stringify(updatedHabits));
    } catch (error) {
      console.log('Error saving habits:', error);
    }
  };

  const getCompletionRate = () => {
    if (habits.length === 0) return 0;
    const completed = habits.filter(h => h.completedToday).length;
    return Math.round((completed / habits.length) * 100);
  };

  const getTotalStreak = () => {
    return habits.reduce((sum, habit) => sum + habit.streak, 0);
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>
            Daily Habits 🎯
          </Text>
          <Text style={textStyles.bodyLight}>
            Build healthy routines, one day at a time
          </Text>
        </View>

        {/* Progress Overview */}
        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Today&apos;s Progress</Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[textStyles.h2, { color: colors.success }]}>
                {getCompletionRate()}%
              </Text>
              <Text style={textStyles.caption}>Completed</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[textStyles.h2, { color: colors.primary }]}>
                {habits.filter(h => h.completedToday).length}/{habits.length}
              </Text>
              <Text style={textStyles.caption}>Habits Done</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[textStyles.h2, { color: colors.accent }]}>
                {getTotalStreak()}
              </Text>
              <Text style={textStyles.caption}>Total Streak</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={{
            height: 8,
            backgroundColor: colors.border,
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <View style={{
              height: '100%',
              width: `${getCompletionRate()}%`,
              backgroundColor: colors.success,
              borderRadius: 4,
            }} />
          </View>
        </View>

        {/* Habits List */}
        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Your Habits</Text>
          
          {habits.map((habit) => (
            <TouchableOpacity
              key={habit.id}
              style={[
                commonStyles.cardSmall,
                {
                  backgroundColor: habit.completedToday ? habit.color + '15' : colors.backgroundAlt,
                  borderColor: habit.completedToday ? habit.color : colors.border,
                  marginBottom: 12,
                }
              ]}
              onPress={() => toggleHabit(habit.id)}
            >
              <View style={commonStyles.spaceBetween}>
                <View style={commonStyles.row}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: habit.completedToday ? habit.color : habit.color + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    {habit.completedToday ? (
                      <Icon name="checkmark" size={20} style={{ color: colors.backgroundAlt }} />
                    ) : (
                      <Icon name={habit.icon as any} size={20} style={{ color: habit.color }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      textStyles.body,
                      { 
                        textDecorationLine: habit.completedToday ? 'line-through' : 'none',
                        color: habit.completedToday ? colors.textLight : colors.text 
                      }
                    ]}>
                      {habit.name}
                    </Text>
                    <Text style={textStyles.caption}>
                      {habit.streak} day streak
                    </Text>
                  </View>
                </View>
                <Icon 
                  name={habit.completedToday ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  style={{ color: habit.completedToday ? habit.color : colors.border }} 
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Motivational Section */}
        <LinearGradient
          colors={[colors.success + '20', colors.primary + '20']}
          style={[commonStyles.card, { marginBottom: 30 }]}
        >
          <Icon name="trophy" size={24} style={{ color: colors.success, marginBottom: 8 }} />
          <Text style={[textStyles.h3, { marginBottom: 8 }]}>Keep Going!</Text>
          <Text style={textStyles.body}>
            {getCompletionRate() === 100 
              ? "Amazing! You&apos;ve completed all your habits today! 🎉"
              : getCompletionRate() >= 50
              ? "You&apos;re doing great! Keep up the momentum! 💪"
              : "Every small step counts. You&apos;ve got this! 🌟"
            }
          </Text>
        </LinearGradient>

        {/* Tips */}
        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Icon name="bulb" size={24} style={{ color: colors.warning, marginBottom: 8 }} />
          <Text style={[textStyles.h3, { marginBottom: 8 }]}>Habit Building Tip</Text>
          <Text style={textStyles.body}>
            Start small and be consistent. It&apos;s better to do a 5-minute habit every day 
            than a 1-hour habit once a week. Focus on building the routine first!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}