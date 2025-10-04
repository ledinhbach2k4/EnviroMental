import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { commonStyles, textStyles, colors, buttonStyles } from '../../assets/styles/commonStyles';
import Icon from '../../components/Icon';
import { Ionicons } from '@expo/vector-icons';
import AddHabitModal from '../../components/AddHabitModal';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSharedHabits } from '../../context/HabitsContext';
import type { Habit } from '../../hooks/useHabits';

export default function HabitsTracker() {
  const {
    habits,
    loading,
    error,
    refetch,
    addHabit,
    toggleHabitCompletion,
    deleteMultipleHabits,
    deleteAllHabits,
  } = useSharedHabits();

  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedHabits, setSelectedHabits] = useState<number[]>([]);

  // Reset selection when exiting delete mode
  useEffect(() => {
    if (!isDeleteMode) {
      setSelectedHabits([]);
    }
  }, [isDeleteMode]);

  const handleOpenAddModal = () => {
    if (habits.length >= 10) {
      Alert.alert(
        "Habit Limit Reached",
        "You can add a maximum of 10 habits. Please remove an existing habit to add a new one."
      );
    } else {
      setAddModalVisible(true);
    }
  };

  const handleAddHabit = async (newHabit: { name: string; icon: keyof typeof Ionicons.glyphMap }) => {
    await addHabit({ name: newHabit.name, icon: newHabit.icon });
    setAddModalVisible(false);
  };

  const handleToggleHabit = async (habitId: number, currentCompleted: boolean) => {
    if (isDeleteMode) {
      handleSelectHabit(habitId);
      return;
    }
    setToggleLoading(habitId);
    try {
      await toggleHabitCompletion(habitId, currentCompleted);
    } catch {
      Alert.alert('Error', 'Failed to toggle habit. Please try again.');
    } finally {
      setToggleLoading(null);
    }
  };

  const handleSelectHabit = (habitId: number) => {
    setSelectedHabits(prev =>
      prev.includes(habitId) ? prev.filter(id => id !== habitId) : [...prev, habitId]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedHabits.length === 0) return;
    Alert.alert(
      "Delete Selected Habits",
      `Are you sure you want to delete ${selectedHabits.length} habit(s)? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: async () => {
            try {
              await deleteMultipleHabits(selectedHabits);
              setIsDeleteMode(false); // Exit delete mode on success
            } catch {
              Alert.alert('Error', 'Failed to delete selected habits. Please try again.');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      "Delete All Habits",
      "Are you sure you want to delete ALL your habits? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete All", 
          onPress: async () => {
            try {
              await deleteAllHabits();
              setIsDeleteMode(false); // Exit delete mode on success
            } catch {
              Alert.alert('Error', 'Failed to delete all habits. Please try again.');
            }
          },
          style: "destructive"
        }
      ]
    );
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
          <Text style={[textStyles.h1, { color: colors.primary }]}>Daily Habits 🎯</Text>
          <Text style={[textStyles.bodyLight, { marginTop: 8 }]}>Build healthy routines, one day at a time</Text>
        </Animated.View>

        {/* Progress Card */}
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
            <View style={{ height: '100%', width: `${getCompletionRate()}%`, backgroundColor: colors.success, borderRadius: 4 }} />
          </View>
        </Animated.View>

        {/* Habits List Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={[commonStyles.card, { marginBottom: 20 }]}>
          <View style={[commonStyles.spaceBetween, { marginBottom: 16 }]}>
            <Text style={[textStyles.h3]}>Your Habits</Text>
            {habits.length > 0 && (
              <TouchableOpacity onPress={() => setIsDeleteMode(!isDeleteMode)} style={{ padding: 4 }}>
                <Text style={{ color: isDeleteMode ? colors.danger : colors.primary }}>
                  {isDeleteMode ? 'Cancel' : 'Manage'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {habits.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Icon name="checkmark-circle-outline" size={40} color={colors.textLight} style={{ marginBottom: 10 }} />
              <Text style={[textStyles.body, { textAlign: 'center', color: colors.textLight }]}>
                No habits added yet. Tap &quot;Add New Habit&quot; to get started!
              </Text>
            </View>
          ) : (
            habits.map((habit: Habit, index: number) => {
              const isSelected = selectedHabits.includes(habit.id);
              return (
                <Animated.View key={habit.id} entering={FadeInDown.delay(300 + index * 50)}>
                  <TouchableOpacity
                    style={[
                      commonStyles.cardSmall,
                      {
                        borderWidth: 1,
                        borderColor: isDeleteMode ? (isSelected ? colors.danger : colors.border) : (habit.completedToday ? habit.color : colors.border),
                        marginBottom: 12,
                        backgroundColor: habit.completedToday ? habit.color + '10' : colors.card,
                        opacity: toggleLoading === habit.id ? 0.5 : 1,
                      }
                    ]}
                    onPress={() => handleToggleHabit(habit.id, habit.completedToday)}
                    disabled={toggleLoading === habit.id}
                    activeOpacity={0.7}
                  >
                    <View style={[commonStyles.spaceBetween, { padding: 12 }]}>
                      <View style={[commonStyles.row, { flex: 1, alignItems: 'center' }]}>
                        <View style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: habit.completedToday ? habit.color : habit.color + '20',
                          alignItems: 'center', justifyContent: 'center', marginRight: 12,
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
                        name={isDeleteMode 
                          ? (isSelected ? "checkbox" : "square-outline")
                          : (habit.completedToday ? "checkmark-circle" : "ellipse-outline")}
                        size={24}
                        color={isDeleteMode 
                          ? (isSelected ? colors.danger : colors.border)
                          : (habit.completedToday ? habit.color : colors.border)}
                      />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )
            })
          )}

          {isDeleteMode ? (
            <View style={[commonStyles.row, { justifyContent: 'space-between', marginTop: 12, gap: 10 }]}>
              <TouchableOpacity 
                style={[buttonStyles.danger, { flex: 1 }, selectedHabits.length === 0 && commonStyles.disabled]} 
                onPress={handleDeleteSelected}
                disabled={selectedHabits.length === 0}
              >
                <Text style={textStyles.button}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[buttonStyles.dangerOutline, { flex: 1 }]} 
                onPress={handleDeleteAll}
              >
                <Text style={[textStyles.button, { color: colors.danger }]}>Delete All</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[buttonStyles.primary, { marginTop: 12 }]} 
              onPress={handleOpenAddModal}
            >
              <Text style={textStyles.button}>Add New Habit</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Tip Cards... */}

      </ScrollView>
      <AddHabitModal
        visible={isAddModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAddHabit}
      />
    </View>
  );
}
