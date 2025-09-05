import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, textStyles, colors, buttonStyles } from '../../assets/styles/commonStyles';
import Icon from '../../components/Icon';
import { Ionicons } from '@expo/vector-icons';
import AddHabitModal from '../../components/AddHabitModal';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useHabits, Habit } from '../../hooks/useHabits';

export default function HabitsTracker() {
  const { habits, loading, error, refetch, addHabit, toggleHabitCompletion } = useHabits();
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);

  const handleAddHabit = async (newHabit: { name: string; icon: keyof typeof Ionicons.glyphMap }) => {
    await addHabit({ name: newHabit.name });
    setAddModalVisible(false);
  };

  const handleToggleHabit = async (habitId: number, currentCompleted: boolean) => {
    setToggleLoading(habitId);
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        toggleHabitCompletion(habitId, currentCompleted),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), 5000);
        }),
      ]);
    } catch (err) {
      // console.error('Toggle error:', err); // It's better to log this to a crash reporting service
      Alert.alert('Error', 'Failed to toggle habit. Please try again.');
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setToggleLoading(null);
    }
  };

  const getCompletionRate = () => {
    if (habits.length === 0) return 0;
    const completed = habits.filter((h: Habit) => h.completedToday).length;
    return Math.round((completed / habits.length) * 100);
  };

  const getTotalStreak = () => {
    return habits.reduce((sum: number, habit: Habit) => sum + (habit.streak || 0), 0);
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={textStyles.body}>Loading your habits...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={[textStyles.h3, { color: colors.danger, marginBottom: 16 }]}>Oops! Something went wrong.</Text>
        <Text style={[textStyles.body, { textAlign: 'center', marginBottom: 24 }]}>{error}</Text>
        <TouchableOpacity style={buttonStyles.primary} onPress={() => refetch()}>
          <Text style={textStyles.button}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[commonStyles.container, { paddingTop: Platform.OS === 'ios' ? 40 : 20 }]}>
      <ScrollView
        style={commonStyles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Animated.View entering={FadeInDown} style={{ marginVertical: 20 }}>
                    <Text style={[textStyles.h1, { color: colors.primary }]}>Daily Habits &#39;🎯&#39;</Text>
          <Text style={[textStyles.bodyLight, { marginTop: 8 }]}>Build healthy routines, one day at a time</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={[commonStyles.card, { marginBottom: 20 }]}>
          <View style={[commonStyles.spaceBetween, { marginBottom: 16 }]}>
            <Text style={[textStyles.h3]}>Today&apos;s Progress</Text>
          </View>
          <View style={[commonStyles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[textStyles.h2, { color: colors.success }]}>{getCompletionRate()}%</Text>
              <Text style={[textStyles.caption]}>Completed</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[textStyles.h2, { color: colors.primary }]}>{habits.filter((h: Habit) => h.completedToday).length}/{habits.length}</Text>
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
            <Text style={[textStyles.h3]}>Your Habits</Text>
          </View>
          {habits.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Icon name="checkmark-circle-outline" size={40} color={colors.textLight} style={{ marginBottom: 10 }} />
              <Text style={[textStyles.body, { textAlign: 'center', color: colors.textLight }]}>
                No habits added yet. Tap &quot;Add New Habit&quot; to get started!
              </Text>
            </View>
          ) : (
            habits.map((habit: Habit, index: number) => (
              <Animated.View 
                key={habit.id}
                entering={FadeInDown.delay(300 + index * 50)}
              >
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
                  onPress={() => handleToggleHabit(habit.id, habit.completedToday)}
                  disabled={toggleLoading === habit.id}
                  activeOpacity={0.7}
                >
                  <View style={[commonStyles.spaceBetween, { padding: 12 }]}>
                    <View style={[
                      commonStyles.row, 
                      { flex: 1, alignItems: 'center' }
                    ]}>
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
                    {toggleLoading === habit.id && <ActivityIndicator size="small" color={colors.primary} />}
                    <Icon 
                      name={habit.completedToday ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={habit.completedToday ? habit.color : colors.border}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}
          <View style={[commonStyles.row, { justifyContent: 'space-between', marginTop: 12 }]}>
              <TouchableOpacity 
                style={[buttonStyles.primary, { flex: 1 }]}
                onPress={() => setAddModalVisible(true)}
              >
                <Text style={textStyles.button}>Add New Habit</Text>
              </TouchableOpacity>
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
                ? "Amazing! You&#39;ve completed all your habits! 🎉"
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
