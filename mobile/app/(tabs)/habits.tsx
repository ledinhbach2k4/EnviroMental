import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, textStyles, colors, buttonStyles } from '../../assets/styles/commonStyles';
import Icon from '../../components/Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import AddHabitModal from '../../components/AddHabitModal';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';

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
  { name: 'Drink 2 liters of water', icon: 'water-outline', color: colors.primary },
  { name: 'Exercise for 30 minutes', icon: 'barbell-outline', color: colors.success },
  { name: 'Meditate for 10 minutes', icon: 'leaf-outline', color: colors.secondary },
  { name: 'Read for 20 minutes', icon: 'book-outline', color: colors.warning },
  { name: 'Sleep 7-8 hours', icon: 'bed-outline', color: colors.accent },
  { name: 'Eat a healthy meal', icon: 'nutrition-outline', color: colors.primary },
];

export default function HabitsTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const stored = await AsyncStorage.getItem('habits');
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

  const handleAddHabit = async (newHabit: { name: string; icon: keyof typeof Ionicons.glyphMap }) => {
    const newHabitWithId = {
      ...newHabit,
      id: Date.now().toString(),
      color: colors.primary,
      streak: 0,
      completedToday: false,
      completedDates: [],
    };

    const updatedHabits = [...habits, newHabitWithId];
    setHabits(updatedHabits);

    try {
      await AsyncStorage.setItem('habits', JSON.stringify(updatedHabits));
    } catch (error) {
      console.log('Error saving new habit:', error);
    }
  };

  const handleDeleteHabits = async () => {
    const updatedHabits = habits.filter(habit => !selectedHabits.has(habit.id));
    setHabits(updatedHabits);
    setSelectedHabits(new Set());
    setIsEditMode(false);

    try {
      await AsyncStorage.setItem('habits', JSON.stringify(updatedHabits));
    } catch (error) {
      console.log('Error deleting habits:', error);
    }
  };

  const resetToDefaultHabits = async () => {
    const initialHabits = defaultHabits.map((habit, index) => ({
      ...habit,
      id: index.toString(),
      streak: 0,
      completedToday: false,
      completedDates: [],
    }));
    setHabits(initialHabits);
    try {
      await AsyncStorage.setItem('habits', JSON.stringify(initialHabits));
    } catch (error) {
      console.log('Error resetting habits:', error);
    }
  };

  const toggleSelectHabit = (habitId: string) => {
    const newSelected = new Set(selectedHabits);
    if (newSelected.has(habitId)) {
      newSelected.delete(habitId);
    } else {
      newSelected.add(habitId);
    }
    setSelectedHabits(newSelected);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedHabits(new Set());
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
    <View style={[commonStyles.container, { paddingTop: Platform.OS === 'ios' ? 40 : 20 }]}>
      <ScrollView 
        style={commonStyles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Animated.View entering={FadeInDown} style={{ marginVertical: 20 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>Daily Habits 🎯</Text>
          <Text style={[textStyles.bodyLight, { marginTop: 8 }]}>Build healthy routines, one day at a time</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={[commonStyles.card, { marginBottom: 20 }]}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Today&apos;s Progress</Text>
          <View style={[commonStyles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[textStyles.h2, { color: colors.success }]}>{getCompletionRate()}%</Text>
              <Text style={textStyles.caption}>Completed</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[textStyles.h2, { color: colors.primary }]}>{habits.filter(h => h.completedToday).length}/{habits.length}</Text>
              <Text style={textStyles.caption}>Habits Done</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[textStyles.h2, { color: colors.accent }]}>{getTotalStreak()}</Text>
              <Text style={textStyles.caption}>Total Streak</Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ 
              height: '100%', 
              width: `${getCompletionRate()}%`, 
              backgroundColor: colors.success, 
              borderRadius: 4,
            }} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={[commonStyles.card, { marginBottom: 20 }]}>
          <View style={[commonStyles.spaceBetween, { marginBottom: 16 }]}>
            <Text style={[textStyles.h3]}>{isEditMode ? 'Select Habits to Delete' : 'Your Habits'}</Text>
            <TouchableOpacity onPress={toggleEditMode}>
              <Text style={[textStyles.body, { color: colors.primary }]}>{isEditMode ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          {habits.map((habit, index) => (
            <Animated.View 
              key={habit.id}
              entering={FadeInDown.delay(300 + index * 50)}
              style={{ position: 'relative' }}
            >
              {isEditMode && (
                <Animated.View 
                  entering={FadeIn} 
                  exiting={FadeOut}
                  style={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12, 
                    zIndex: 1 
                  }}
                >
                  <TouchableOpacity onPress={() => toggleSelectHabit(habit.id)}>
                    <Icon 
                      name={selectedHabits.has(habit.id) ? 'checkbox' : 'square-outline'} 
                      size={24} 
                      color={colors.primary} 
                    />
                  </TouchableOpacity>
                </Animated.View>
              )}
              <TouchableOpacity
                style={[
                  commonStyles.cardSmall,
                  {
                    borderWidth: 1,
                    borderColor: habit.completedToday ? habit.color : colors.border,
                    marginBottom: 12,
                    backgroundColor: habit.completedToday ? habit.color + '10' : colors.card,
                  }
                ]}
                onPress={() => !isEditMode && toggleHabit(habit.id)}
                activeOpacity={isEditMode ? 1 : 0.7}
              >
                <View style={[commonStyles.spaceBetween, { padding: 12 }]}>
                  <View style={[commonStyles.row, { flex: 1, alignItems: 'center' }]}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: habit.completedToday ? habit.color : habit.color + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      <Icon 
                        name={habit.completedToday ? "checkmark" : habit.icon}
                        size={20}
                        color={habit.completedToday ? colors.backgroundAlt : habit.color}
                      />
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
                      <Text style={textStyles.caption}>{habit.streak} day streak</Text>
                    </View>
                  </View>
                  {!isEditMode && (
                    <Icon 
                      name={habit.completedToday ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={habit.completedToday ? habit.color : colors.border}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
          <View style={[commonStyles.row, { justifyContent: 'space-between', marginTop: 12 }]}>
            {!isEditMode ? (
              <>
                <TouchableOpacity 
                  style={[buttonStyles.primary, { flex: 1, marginRight: 8 }]} 
                  onPress={() => setAddModalVisible(true)}
                >
                  <Text style={textStyles.button}>Add New Habit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[buttonStyles.outline, { flex: 1 }]} 
                  onPress={resetToDefaultHabits}
                >
                  <Text style={textStyles.buttonOutline}>Reset to Default</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={[
                  buttonStyles.primary, 
                  { flex: 1, backgroundColor: selectedHabits.size > 0 ? colors.danger : colors.border }
                ]} 
                onPress={selectedHabits.size > 0 ? handleDeleteHabits : undefined}
                disabled={selectedHabits.size === 0}
              >
                <Text style={textStyles.button}>Delete ({selectedHabits.size})</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={[commonStyles.card, { marginBottom: 20 }]}>
          <LinearGradient 
            colors={[colors.success + '20', colors.primary + '20']} 
            style={{ borderRadius: 16, padding: 20 }}
          >
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
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)} style={[commonStyles.card, { marginBottom: 20 }]}>
          <Icon name="bulb" size={24} color={colors.warning} style={{ marginBottom: 8 }} />
          <Text style={[textStyles.h3, { marginBottom: 8 }]}>Habit Building Tip</Text>
          <Text style={textStyles.body}>
            Start small and be consistent. It&apos;s better to do a 5-minute habit every day than a 1-hour habit once a week.
          </Text>
        </Animated.View>
      </ScrollView>
      <AddHabitModal
        visible={isAddModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAddHabit}
      />
    </View>
  );
}