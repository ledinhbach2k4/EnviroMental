import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AddHabitModal from '../../components/AddHabitModal';
import Animated, {
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { useSharedHabits } from '../../context/HabitsContext';
import type { Habit } from '../../hooks/useHabits';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';
import { AnimatedPressable } from '../../components/motion/AnimatedPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';

interface HabitCardRowProps {
  habit: Habit;
  index: number;
  isSelected: boolean;
  isDeleteMode: boolean;
  isToggleLoading: boolean;
  onToggle: () => void;
  colors: any;
  typography: any;
  spacing: any;
  radii: any;
  styles: any;
}

function HabitCardRow({
  habit,
  index,
  isSelected,
  isDeleteMode,
  isToggleLoading,
  onToggle,
  colors,
  typography,
  spacing,
  styles,
}: HabitCardRowProps) {
  const isCompleted = habit.completedToday;
  const prevCompletedRef = useRef(isCompleted);
  const checkScale = useSharedValue(1);
  const bgAnim = useSharedValue(isCompleted ? 1 : 0);

  useEffect(() => {
    bgAnim.value = withTiming(isCompleted ? 1 : 0, {
      duration: animationTokens.durations.normal,
    });
    if (prevCompletedRef.current !== isCompleted) {
      checkScale.value = withSequence(
        withSpring(1.18, { damping: 14, stiffness: 220 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      prevCompletedRef.current = isCompleted;
    }
  }, [isCompleted, bgAnim, checkScale]);

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const animatedBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(bgAnim.value, [0, 1], [colors.surface, habit.color + '14']),
    borderColor: interpolateColor(bgAnim.value, [0, 1], [colors.border, habit.color + '45']),
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(300 + index * 40, 600))
        .springify()
        .damping(20)}
      layout={LinearTransition.duration(200)}
    >
      <AnimatedPressable
        scaleTo={animationTokens.micro.cardPressScale}
        style={[
          styles.cardSmall,
          {
            marginBottom: spacing.sm,
            opacity: isToggleLoading ? 0.7 : 1,
          },
          animatedBgStyle,
        ]}
        onPress={onToggle}
        disabled={isToggleLoading}
      >
        <View style={styles.cardRowContent}>
          <View style={styles.cardLeftSection}>
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: habit.completedToday ? habit.color : habit.color + '20',
                },
                animatedCheckStyle,
              ]}
            >
              <Icon
                name={habit.completedToday ? 'checkmark' : habit.icon}
                size={20}
                color={habit.completedToday ? colors.textInverse : habit.color}
              />
            </Animated.View>
            <View style={styles.textContainer}>
              <Text
                style={[
                  typography.body,
                  styles.habitTitle,
                  {
                    textDecorationLine: habit.completedToday ? 'line-through' : 'none',
                    color: habit.completedToday ? colors.textMuted : colors.text,
                  },
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {habit.name}
              </Text>
              <View style={styles.streakRow}>
                {habit.streak > 0 ? (
                  <>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <Text style={[typography.caption, { color: colors.accent, fontWeight: '600' }]}>
                      {habit.streak} {habit.streak === 1 ? 'day' : 'days'}
                    </Text>
                  </>
                ) : (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Start streak today
                  </Text>
                )}
              </View>
            </View>
          </View>
          <View style={styles.actionContainer}>
            {isToggleLoading ? (
              <ActivityIndicator size="small" color={habit.color || colors.primary} />
            ) : (
              <Animated.View style={animatedCheckStyle}>
                <Icon
                  name={
                    isDeleteMode
                      ? isSelected
                        ? 'checkbox'
                        : 'square-outline'
                      : habit.completedToday
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                  }
                  size={26}
                  color={
                    isDeleteMode
                      ? isSelected
                        ? colors.danger
                        : colors.border
                      : habit.completedToday
                        ? habit.color
                        : colors.border
                  }
                />
              </Animated.View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function HabitsTracker() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  const insets = useSafeAreaInsets();

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

  const [prevDeleteMode, setPrevDeleteMode] = useState(isDeleteMode);
  if (isDeleteMode !== prevDeleteMode) {
    setPrevDeleteMode(isDeleteMode);
    if (!isDeleteMode) {
      setSelectedHabits([]);
    }
  }

  const handleOpenAddModal = () => {
    if (habits.length >= 10) {
      Alert.alert(
        'Habit Limit Reached',
        'You can add a maximum of 10 habits. Please remove an existing habit to add a new one.'
      );
    } else {
      setAddModalVisible(true);
    }
  };

  const handleAddHabit = async (newHabit: {
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => {
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
    setSelectedHabits((prev) =>
      prev.includes(habitId) ? prev.filter((id) => id !== habitId) : [...prev, habitId]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedHabits.length === 0) return;
    Alert.alert(
      'Delete Selected Habits',
      `Are you sure you want to delete ${selectedHabits.length} habit(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteMultipleHabits(selectedHabits);
              setIsDeleteMode(false);
            } catch {
              Alert.alert('Error', 'Failed to delete selected habits. Please try again.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All Habits',
      'Are you sure you want to delete ALL your habits? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          onPress: async () => {
            try {
              await deleteAllHabits();
              setIsDeleteMode(false);
            } catch {
              Alert.alert('Error', 'Failed to delete all habits. Please try again.');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const getCompletionRate = () => {
    if (habits.length === 0) return 0;
    const completed = habits.filter((h: Habit) => h.completedToday).length;
    return Math.round((completed / habits.length) * 100);
  };

  const completionRate =
    habits.length === 0
      ? 0
      : Math.round((habits.filter((h: Habit) => h.completedToday).length / habits.length) * 100);

  const animatedProgress = useSharedValue(completionRate);

  useEffect(() => {
    animatedProgress.value = withTiming(completionRate, {
      duration: animationTokens.durations.moderate,
    });
  }, [completionRate, animatedProgress]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  const getTotalStreak = () => {
    return habits.reduce((sum: number, habit: Habit) => sum + (habit.streak || 0), 0);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ ...typography.body, marginTop: spacing.md }}>Loading your habits...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.lg,
        }}
      >
        <Text style={{ ...typography.h3, color: colors.danger, marginBottom: spacing.lg }}>
          Oops! Something went wrong.
        </Text>
        <Text style={{ ...typography.body, textAlign: 'center', marginBottom: spacing.xl }}>
          {error}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            borderRadius: radii.lg,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xl,
            ...shadows.sm,
          }}
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
      borderRadius: radii.xl,
      padding: spacing.lg,
      marginVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    cardSmall: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: spacing.xs,
      overflow: 'hidden',
      ...shadows.xs,
    },
    cardRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      minHeight: 64,
    },
    cardLeftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      flexShrink: 1,
      marginRight: spacing.xs,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    textContainer: {
      flex: 1,
      flexShrink: 1,
      justifyContent: 'center',
    },
    habitTitle: {
      fontWeight: '500',
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    streakEmoji: {
      fontSize: 12,
      marginRight: 4,
    },
    actionContainer: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.xs,
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
    deleteActionButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: colors.danger,
    },
    deleteSolidButton: {
      backgroundColor: colors.danger,
      ...shadows.sm,
    },
    deleteOutlineButton: {
      backgroundColor: 'transparent',
    },
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Animated.View entering={FadeInDown} style={{ marginVertical: spacing.xl }}>
          <Text style={[typography.h1, { color: colors.primary }]}>Daily Habits 🎯</Text>
          <Text style={[typography.bodySmall, { marginTop: spacing.sm }]}>
            Build healthy routines, one day at a time
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100)}
          style={[styles.card, { marginBottom: spacing.lg }]}
        >
          <View style={[styles.spaceBetween, { marginBottom: spacing.lg }]}>
            <Text style={typography.h3}>Today&apos;s Progress</Text>
          </View>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: spacing.lg }]}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[typography.h2, { color: colors.success }]}>{getCompletionRate()}%</Text>
              <Text style={typography.caption}>Completed</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[typography.h2, { color: colors.primary }]}>
                {habits.filter((h: Habit) => h.completedToday).length}/{habits.length}
              </Text>
              <Text style={typography.caption}>Habits Done</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[typography.h2, { color: colors.accent }]}>{getTotalStreak()}</Text>
              <Text style={typography.caption}>Total Streak</Text>
            </View>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: colors.border,
              borderRadius: radii.full,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[
                {
                  height: '100%',
                  backgroundColor: colors.success,
                  borderRadius: radii.full,
                },
                progressBarStyle,
              ]}
            />
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200)}
          style={[styles.card, { marginBottom: spacing.lg }]}
        >
          <View style={[styles.spaceBetween, { marginBottom: spacing.lg }]}>
            <Text style={typography.h3}>Your Habits</Text>
            {habits.length > 0 && (
              <TouchableOpacity
                onPress={() => setIsDeleteMode(!isDeleteMode)}
                style={{ padding: spacing.xs }}
              >
                <Text
                  style={{
                    color: isDeleteMode ? colors.danger : colors.primary,
                    fontWeight: '600',
                  }}
                >
                  {isDeleteMode ? 'Cancel' : 'Manage'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {habits.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Icon
                name="checkmark-circle-outline"
                size={40}
                color={colors.textMuted}
                style={{ marginBottom: spacing.md }}
              />
              <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted }]}>
                No habits added yet. Tap &quot;Add New Habit&quot; to get started!
              </Text>
            </View>
          ) : (
            habits.map((habit: Habit, index: number) => {
              const isSelected = selectedHabits.includes(habit.id);
              return (
                <HabitCardRow
                  key={habit.id}
                  habit={habit}
                  index={index}
                  isSelected={isSelected}
                  isDeleteMode={isDeleteMode}
                  isToggleLoading={toggleLoading === habit.id}
                  onToggle={() => handleToggleHabit(habit.id, habit.completedToday)}
                  colors={colors}
                  typography={typography}
                  spacing={spacing}
                  radii={radii}
                  styles={styles}
                />
              );
            })
          )}

          {isDeleteMode ? (
            <View
              style={[
                styles.row,
                { justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.md },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.deleteActionButton,
                  styles.deleteSolidButton,
                  selectedHabits.length === 0 && styles.disabled,
                ]}
                onPress={handleDeleteSelected}
                disabled={selectedHabits.length === 0}
              >
                <Text style={typography.button}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteActionButton, styles.deleteOutlineButton]}
                onPress={handleDeleteAll}
              >
                <Text style={[typography.button, { color: colors.danger }]}>Delete All</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  marginTop: spacing.md,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  ...shadows.sm,
                },
              ]}
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
