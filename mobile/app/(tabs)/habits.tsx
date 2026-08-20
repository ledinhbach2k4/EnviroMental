import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AddHabitModal from '../../components/AddHabitModal';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSharedHabits } from '../../context/HabitsContext';
import type { Habit } from '../../hooks/useHabits';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import Icon from '../../components/Icon';

export default function HabitsTracker() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

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
              setIsDeleteMode(false);
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
              setIsDeleteMode(false);
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
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ ...typography.body, marginTop: spacing.md }}>Loading your habits...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
        <Text style={{ ...typography.h3, color: colors.danger, marginBottom: spacing.lg }}>Oops! Something went wrong.</Text>
        <Text style={{ ...typography.body, textAlign: 'center', marginBottom: spacing.xl }}>{error}</Text>
        <TouchableOpacity 
          style={{ backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, ...shadows.sm }} 
          onPress={() => refetch()}
        >
          <Text style={typography.button}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginVertical: spacing.sm,
      ...shadows.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardSmall: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      marginVertical: spacing.xs,
      ...shadows.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    spaceBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Animated.View entering={FadeInDown} style={{ marginVertical: spacing.xl }}>
          <Text style={[typography.h1, { color: colors.primary }]}>Daily Habits 🎯</Text>
          <Text style={[typography.bodySmall, { marginTop: spacing.sm }]}>Build healthy routines, one day at a time</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={[styles.card, { marginBottom: spacing.lg }]}>
          <View style={[styles.spaceBetween, { marginBottom: spacing.lg }]}>
            <Text style={typography.h3}>Today&apos;s Progress</Text>
          </View>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: spacing.lg }]}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[typography.h2, { color: colors.success }]}>{getCompletionRate()}%</Text>
              <Text style={typography.caption}>Completed</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[typography.h2, { color: colors.primary }]}>{habits.filter((h: Habit) => h.completedToday).length}/{habits.length}</Text>
              <Text style={typography.caption}>Habits Done</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[typography.h2, { color: colors.accent }]}>{getTotalStreak()}</Text>
              <Text style={typography.caption}>Total Streak</Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${getCompletionRate()}%`, backgroundColor: colors.success, borderRadius: 4 }} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={[styles.card, { marginBottom: spacing.lg }]}>
          <View style={[styles.spaceBetween, { marginBottom: spacing.lg }]}>
            <Text style={typography.h3}>Your Habits</Text>
            {habits.length > 0 && (
              <TouchableOpacity onPress={() => setIsDeleteMode(!isDeleteMode)} style={{ padding: spacing.xs }}>
                <Text style={{ color: isDeleteMode ? colors.danger : colors.primary }}>
                  {isDeleteMode ? 'Cancel' : 'Manage'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {habits.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Icon name="checkmark-circle-outline" size={40} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
              <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted }]}>
                No habits added yet. Tap "Add New Habit" to get started!
              </Text>
            </View>
          ) : (
            habits.map((habit: Habit, index: number) => {
              const isSelected = selectedHabits.includes(habit.id);
              return (
                <Animated.View key={habit.id} entering={FadeInDown.delay(300 + index * 50)}>
                  <TouchableOpacity
                    style={[
                      styles.cardSmall,
                      {
                        borderWidth: 1,
                        borderColor: isDeleteMode ? (isSelected ? colors.danger : colors.border) : (habit.completedToday ? habit.color : colors.border),
                        marginBottom: spacing.md,
                        backgroundColor: habit.completedToday ? habit.color + '10' : colors.card,
                        opacity: toggleLoading === habit.id ? 0.5 : 1,
                      }
                    ]}
                    onPress={() => handleToggleHabit(habit.id, habit.completedToday)}
                    disabled={toggleLoading === habit.id}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.spaceBetween, { padding: spacing.md }]}>
                      <View style={[styles.row, { flex: 1, alignItems: 'center' }]}>
                        <View style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: habit.completedToday ? habit.color : habit.color + '20',
                          alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
                        }}>
                          <Icon 
                            name={habit.completedToday ? "checkmark" : habit.icon}
                            size={20}
                            color={habit.completedToday ? colors.textInverse : habit.color}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            typography.body,
                            { 
                              textDecorationLine: habit.completedToday ? 'line-through' : 'none',
                              color: habit.completedToday ? colors.textMuted : colors.text
                            }
                          ]}>
                            {habit.name}
                          </Text>
                          <Text style={typography.caption}>{habit.streak} day streak</Text>
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
            <View style={[styles.row, { justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.md }]}>
              <TouchableOpacity 
                style={[{ backgroundColor: colors.danger, borderRadius: radii.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'center', flex: 1, ...shadows.sm }, selectedHabits.length === 0 && styles.disabled]} 
                onPress={handleDeleteSelected}
                disabled={selectedHabits.length === 0}
              >
                <Text style={typography.button}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.cardSmall, { flex: 1, alignItems: 'center', backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.danger }]} 
                onPress={handleDeleteAll}
              >
                <Text style={[typography.button, { color: colors.danger }]}>Delete All</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.card, { marginTop: spacing.md, backgroundColor: colors.primary, alignItems: 'center', ...shadows.sm }]} 
              onPress={handleOpenAddModal}
            >
              <Text style={typography.button}>Add New Habit</Text>
            </TouchableOpacity>
          )}
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