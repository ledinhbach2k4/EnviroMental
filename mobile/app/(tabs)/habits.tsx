import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, textStyles, colors } from '../../assets/styles/commonStyles';
import Icon from '../../components/Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

interface Habit {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  streak: number;
  completedToday: boolean;
  completedDates: string[];
}

const defaultHabits: Omit<Habit, 'id' | 'streak' | 'completedToday' | 'completedDates'>[] = [
  { name: 'Drink 8 glasses of water', icon: 'water-outline', color: colors.primary },
  { name: 'Exercise for 30 minutes', icon: 'barbell-outline', color: colors.success },
  { name: 'Meditate for 10 minutes', icon: 'leaf-outline', color: colors.secondary },
  { name: 'Get 8 hours of sleep', icon: 'moon-outline', color: colors.accent },
  { name: 'Write in journal', icon: 'book-outline', color: colors.warning },
];

const CardContent = ({ children }) => (
  <>{children}</>
);

const AndroidCardContent = ({ style, children }) => (
  <View style={style}>{children}</View>
);

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
        const today = new Date().toDateString();
        const updatedHabits = storedHabits.map((habit: Habit) => ({
          ...habit,
          completedToday: habit.completedDates.includes(today),
        }));
        setHabits(updatedHabits);
      } else {
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

  const CardWrapper = Platform.OS === 'android' ? AndroidCardContent : CardContent;

  return (
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>Daily Habits 🎯</Text>
          <Text style={textStyles.bodyLight}>Build healthy routines, one day at a time</Text>
        </View>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper style={commonStyles.cardBody}>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Today&apos;s Progress</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[textStyles.h2, { color: colors.success, textAlign: 'center' }]}>{getCompletionRate()}%</Text>
                <Text style={textStyles.caption}>Completed</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[textStyles.h2, { color: colors.primary, textAlign: 'center' }]}>{habits.filter(h => h.completedToday).length}/{habits.length}</Text>
                <Text style={textStyles.caption}>Habits Done</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[textStyles.h2, { color: colors.accent, textAlign: 'center' }]}>{getTotalStreak()}</Text>
                <Text style={textStyles.caption}>Total Streak</Text>
              </View>
            </View>
            <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${getCompletionRate()}%`, backgroundColor: colors.success, borderRadius: 4 }} />
            </View>
          </CardWrapper>
        </View>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper style={commonStyles.cardBody}>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Your Habits</Text>
            {habits.map((habit) => (
              <TouchableOpacity
                key={habit.id}
                style={[
                  commonStyles.cardSmall,
                  {
                    borderColor: habit.completedToday ? habit.color : colors.border,
                    marginBottom: 12,
                  }
                ]}
                onPress={() => toggleHabit(habit.id)}
              >
                <CardWrapper style={commonStyles.cardSmallBody}>
                  <View style={commonStyles.spaceBetween}>
                    <View style={[commonStyles.row, { flex: 1, flexShrink: 1 }]}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: habit.completedToday ? habit.color : habit.color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                        {habit.completedToday ? (
                          <Icon name="checkmark" size={20} color={colors.backgroundAlt} />
                        ) : (
                          <Icon name={habit.icon} size={20} color={habit.color} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[textStyles.body, { textDecorationLine: habit.completedToday ? 'line-through' : 'none', color: habit.completedToday ? colors.textLight : colors.text }]}>{habit.name}</Text>
                        <Text style={textStyles.caption}>{habit.streak} day streak</Text>
                      </View>
                    </View>
                    <Icon name={habit.completedToday ? "checkmark-circle" : "ellipse-outline"} size={24} color={habit.completedToday ? habit.color : colors.border} />
                  </View>
                </CardWrapper>
              </TouchableOpacity>
            ))}
          </CardWrapper>
        </View>

        <LinearGradient colors={[colors.success + '20', colors.primary + '20']} style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper style={commonStyles.cardBody}>
            <Icon name="trophy" size={24} color={colors.success} style={{ marginBottom: 8 }} />
            <Text style={[textStyles.h3, { marginBottom: 8 }]}>Keep Going!</Text>
            <Text style={textStyles.body}>
              {getCompletionRate() === 100 
                ? "Amazing! You&apos;ve completed all your habits today! 🎉"
                : getCompletionRate() >= 50
                ? "You&apos;re doing great! Keep up the momentum! 💪"
                : "Every small step counts. You&apos;ve got this! 🌟"
              }
            </Text>
          </CardWrapper>
        </LinearGradient>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper style={commonStyles.cardBody}>
            <Icon name="bulb" size={24} color={colors.warning} style={{ marginBottom: 8 }} />
            <Text style={[textStyles.h3, { marginBottom: 8 }]}>Habit Building Tip</Text>
            <Text style={textStyles.body}>Start small and be consistent. It&apos;s better to do a 5-minute habit every day than a 1-hour habit once a week. Focus on building the routine first!</Text>
          </CardWrapper>
        </View>
      </ScrollView>
    </View>
  );
}
