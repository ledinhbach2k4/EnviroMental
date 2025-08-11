import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, textStyles, colors, gradients } from '../../assets/styles/commonStyles';
import { Image } from 'expo-image';
import Button from '../../components/Button';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLogout } from '../../hooks/useLogout';
import { useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import Icon from '@/components/Icon';

interface UserStats {
  totalMoodEntries: number;
  currentStreak: number;
  meditationMinutes: number;
  habitsCompleted: number;
}

export default function Profile() {
  const [userStats, setUserStats] = useState<UserStats>({
    totalMoodEntries: 0,
    currentStreak: 0,
    meditationMinutes: 0,
    habitsCompleted: 0,
  });

  const { user } = useUser();
  const userName = user?.firstName || 'User';
  const userAvatar = user?.imageUrl || 'https://www.gravatar.com/avatar?d=mp';

  const { logout } = useLogout();

  const loadUserStats = useCallback(async () => {
    try {
      const moodData = await AsyncStorage.getItem('moodEntries');
      const moodEntries = moodData ? JSON.parse(moodData) : [];

      const habitsData = await AsyncStorage.getItem('habits');
      const habits = habitsData ? JSON.parse(habitsData) : [];

      const totalMoodEntries = moodEntries.length;
      const currentStreak = calculateMoodStreak(moodEntries);
      const meditationMinutes = 150; // Mock data
      const habitsCompleted = habits.reduce(
        (sum: number, habit: any) => sum + habit.completedDates.length,
        0
      );

      setUserStats({
        totalMoodEntries,
        currentStreak,
        meditationMinutes,
        habitsCompleted,
      });
    } catch (error) {
      console.log('Error loading user stats:', error);
    }
  }, []);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  const calculateMoodStreak = (entries: any[]) => {
    if (entries.length === 0) return 0;

    const sortedEntries = entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    let streak = 0;
    let currentDate = new Date();

    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      const daysDiff = Math.floor(
        (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === streak) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }

    return streak;
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all your data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['moodEntries', 'habits']);
              setUserStats({
                totalMoodEntries: 0,
                currentStreak: 0,
                meditationMinutes: 0,
                habitsCompleted: 0,
              });
              Alert.alert('Data Cleared', 'All your data has been cleared successfully.');
            } catch (error) {
              console.log('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  };

  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['moodEntries', 'habits']);

              if (user) {
                await user.delete();
              }

              setUserStats({
                totalMoodEntries: 0,
                currentStreak: 0,
                meditationMinutes: 0,
                habitsCompleted: 0,
              });

              await logout();

              Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
              router.replace('/(auth)/sign-in');
            } catch (error) {
              console.log('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'This feature would export your data to a file. In a real app, this would generate a downloadable file with your wellness data.',
      [{ text: 'OK' }]
    );
  };

  const contactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Need help? In a real app, this would open your email client or a support chat.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ marginTop: 20, marginBottom: 30, alignItems: 'center' }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: colors.primary,
              marginBottom: 12,
            }}
          >
            <Image
              source={{ uri: userAvatar }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
          <Text style={[textStyles.h1, { color: colors.primary }]}>{userName}</Text>
          <Text style={textStyles.bodyLight}>Your wellness journey overview</Text>
        </View>

        {/* Progress */}
        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Your Progress</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <View
              style={[
                commonStyles.cardSmall,
                {
                  width: '48%',
                  alignItems: 'center',
                  borderColor: colors.moodHappy + '30',
                },
              ]}
            >
              <Icon name="happy" size={24} color={colors.moodHappy} style={{ marginBottom: 8 }} />
              <Text style={[textStyles.h3, { color: colors.moodHappy }]}>
                {userStats.totalMoodEntries}
              </Text>
              <Text style={textStyles.caption}>Mood Entries</Text>
            </View>

            <View
              style={[
                commonStyles.cardSmall,
                {
                  width: '48%',
                  alignItems: 'center',
                  borderColor: colors.success + '30',
                },
              ]}
            >
              <Icon name="flame" size={24} color={colors.success} style={{ marginBottom: 8 }} />
              <Text style={[textStyles.h3, { color: colors.success }]}>
                {userStats.currentStreak}
              </Text>
              <Text style={textStyles.caption}>Day Streak</Text>
            </View>

            <View
              style={[
                commonStyles.cardSmall,
                {
                  width: '48%',
                  alignItems: 'center',
                  borderColor: colors.primary + '30',
                  marginTop: 12,
                },
              ]}
            >
              <Icon name="leaf" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={[textStyles.h3, { color: colors.primary }]}>
                {userStats.meditationMinutes}
              </Text>
              <Text style={textStyles.caption}>Meditation Min</Text>
            </View>

            <View
              style={[
                commonStyles.cardSmall,
                {
                  width: '48%',
                  alignItems: 'center',
                  borderColor: colors.accent + '30',
                  marginTop: 12,
                },
              ]}
            >
              <Icon
                name="checkmark-circle"
                size={24}
                color={colors.accent}
                style={{ marginBottom: 8 }}
              />
              <Text style={[textStyles.h3, { color: colors.accent }]}>
                {userStats.habitsCompleted}
              </Text>
              <Text style={textStyles.caption}>Habits Done</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Settings</Text>
          <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]}>
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon
                  name="notifications"
                  size={24}
                  color={colors.primary}
                  style={{ marginRight: 12 }}
                />
                <Text style={textStyles.body}>Notifications</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]}>
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon
                  name="shield-checkmark"
                  size={24}
                  color={colors.success}
                  style={{ marginRight: 12 }}
                />
                <Text style={textStyles.body}>Privacy & Security</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]} onPress={exportData}>
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon
                  name="download"
                  size={24}
                  color={colors.secondary}
                  style={{ marginRight: 12 }}
                />
                <Text style={textStyles.body}>Export Data</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Support</Text>
          <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]} onPress={contactSupport}>
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon
                  name="help-circle"
                  size={24}
                  color={colors.primary}
                  style={{ marginRight: 12 }}
                />
                <Text style={textStyles.body}>Help & FAQ</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]} onPress={contactSupport}>
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon
                  name="mail"
                  size={24}
                  color={colors.accent}
                  style={{ marginRight: 12 }}
                />
                <Text style={textStyles.body}>Contact Support</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]}>
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon
                  name="information-circle"
                  size={24}
                  color={colors.textLight}
                  style={{ marginRight: 12 }}
                />
                <Text style={textStyles.body}>About EnviroMental</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View
          style={[
            commonStyles.card,
            {
              borderColor: colors.danger + '30',
              marginBottom: 30,
            },
          ]}
        >
          <Text style={[textStyles.h3, { color: colors.danger, marginBottom: 16 }]}>
            Danger Zone
          </Text>
          <Button
            text="Clear All Data"
            onPress={clearAllData}
            style={[{ backgroundColor: colors.danger, width: '100%', marginBottom: 12 }]}
          />
          <Button
            text="Delete Account"
            onPress={deleteAccount}
            style={[{ backgroundColor: colors.danger, width: '100%' }]}
          />
        </View>

        {/* Log Out */}
        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Button
            text="Log Out"
            onPress={logout}
            style={[{ backgroundColor: colors.secondary, width: '100%' }]}
          />
        </View>

        {/* Footer */}
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Text style={textStyles.caption}>EnviroMental v1.0.0</Text>
          <Text style={textStyles.caption}>Your mental wellness companion</Text>
        </View>
      </ScrollView>
    </View>
  );
}
