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

  // Lấy thông tin người dùng từ Clerk
  const { user } = useUser();
  // Sử dụng firstName từ Clerk, fallback là 'User' nếu không có
  const userName = user?.firstName || 'User';
  // Lấy URL avatar từ Clerk, fallback là hình ảnh placeholder
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
      const habitsCompleted = habits.reduce((sum: number, habit: any) => sum + habit.completedDates.length, 0);

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

    const sortedEntries = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    let currentDate = new Date();

    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      const daysDiff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

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
              // Xóa dữ liệu cục bộ
              await AsyncStorage.multiRemove(['moodEntries', 'habits']);
              
              // Xóa tài khoản người dùng từ Clerk
              if (user) {
                await user.delete();
              }

              // Cập nhật trạng thái người dùng
              setUserStats({
                totalMoodEntries: 0,
                currentStreak: 0,
                meditationMinutes: 0,
                habitsCompleted: 0,
              });

              // Đăng xuất người dùng
              await logout();

              Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
              
              // Điều hướng về màn hình đăng nhập
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
        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>Hello, {userName} 👤</Text>
          <Text style={textStyles.bodyLight}>Your wellness journey overview</Text>
        </View>

        <LinearGradient
          colors={gradients.primary}
          style={[commonStyles.card, { alignItems: 'center', marginBottom: 30 }]}
        >
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.backgroundAlt,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            overflow: 'hidden',
          }}>
            <Image
              source={{ uri: userAvatar }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
          <Text style={[textStyles.h2, { color: colors.backgroundAlt, marginBottom: 8 }]}>
            Welcome Back, {userName}!
          </Text>
          <Text style={[textStyles.body, { color: colors.backgroundAlt, textAlign: 'center' }]}>
            You&apos;re doing great on your wellness journey. Keep up the amazing work!
          </Text>
        </LinearGradient>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Your Progress</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <View style={[commonStyles.cardSmall, {
              width: '48%',
              alignItems: 'center',
              backgroundColor: colors.moodHappy + '15',
              borderColor: colors.moodHappy + '30',
            }]}>
              <Icon name="happy" size={24} style={{ color: colors.moodHappy, marginBottom: 8 }} />
              <Text style={[textStyles.h3, { color: colors.moodHappy }]}>
                {userStats.totalMoodEntries}
              </Text>
              <Text style={textStyles.caption}>Mood Entries</Text>
            </View>

            <View style={[commonStyles.cardSmall, {
              width: '48%',
              alignItems: 'center',
              backgroundColor: colors.success + '15',
              borderColor: colors.success + '30',
            }]}>
              <Icon name="flame" size={24} style={{ color: colors.success, marginBottom: 8 }} />
              <Text style={[textStyles.h3, { color: colors.success }]}>
                {userStats.currentStreak}
              </Text>
              <Text style={textStyles.caption}>Day Streak</Text>
            </View>

            <View style={[commonStyles.cardSmall, {
              width: '48%',
              alignItems: 'center',
              backgroundColor: colors.primary + '15',
              borderColor: colors.primary + '30',
              marginTop: 12,
            }]}>
              <Icon name="leaf" size={24} style={{ color: colors.primary, marginBottom: 8 }} />
              <Text style={[textStyles.h3, { color: colors.primary }]}>
                {userStats.meditationMinutes}
              </Text>
              <Text style={textStyles.caption}>Meditation Min</Text>
            </View>

            <View style={[commonStyles.cardSmall, {
              width: '48%',
              alignItems: 'center',
              backgroundColor: colors.accent + '15',
              borderColor: colors.accent + '30',
              marginTop: 12,
            }]}>
              <Icon name="checkmark-circle" size={24} style={{ color: colors.accent, marginBottom: 8 }} />
              <Text style={[textStyles.h3, { color: colors.accent }]}>
                {userStats.habitsCompleted}
              </Text>
              <Text style={textStyles.caption}>Habits Done</Text>
            </View>
          </View>
        </View>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Settings</Text>

          <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]}>
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon name="notifications" size={24} style={{ color: colors.primary, marginRight: 12 }} />
                <Text style={textStyles.body}>Notifications</Text>
              </View>
              <Icon name="chevron-forward" size={20} style={{ color: colors.textLight }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]}>
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon name="shield-checkmark" size={24} style={{ color: colors.success, marginRight: 12 }} />
                <Text style={textStyles.body}>Privacy & Security</Text>
              </View>
              <Icon name="chevron-forward" size={20} style={{ color: colors.textLight }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[commonStyles.cardSmall, { marginBottom: 12 }]}
            onPress={exportData}
          >
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon name="download" size={24} style={{ color: colors.secondary, marginRight: 12 }} />
                <Text style={textStyles.body}>Export Data</Text>
              </View>
              <Icon name="chevron-forward" size={20} style={{ color: colors.textLight }} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Support</Text>

          <TouchableOpacity
            style={[commonStyles.cardSmall, { marginBottom: 12 }]}
            onPress={contactSupport}
          >
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon name="help-circle" size={24} style={{ color: colors.primary, marginRight: 12 }} />
                <Text style={textStyles.body}>Help & FAQ</Text>
              </View>
              <Icon name="chevron-forward" size={20} style={{ color: colors.textLight }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[commonStyles.cardSmall, { marginBottom: 12 }]}
            onPress={contactSupport}
          >
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon name="mail" size={24} style={{ color: colors.accent, marginRight: 12 }} />
                <Text style={textStyles.body}>Contact Support</Text>
              </View>
              <Icon name="chevron-forward" size={20} style={{ color: colors.textLight }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]}>
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon name="information-circle" size={24} style={{ color: colors.textLight, marginRight: 12 }} />
                <Text style={textStyles.body}>About EnviroMental</Text>
              </View>
              <Icon name="chevron-forward" size={20} style={{ color: colors.textLight }} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={[commonStyles.card, {
          backgroundColor: colors.danger + '10',
          borderColor: colors.danger + '30',
          marginBottom: 30
        }]}>
          <Text style={[textStyles.h3, { color: colors.danger, marginBottom: 16 }]}>Danger Zone</Text>
          <Button
            text="Clear All Data"
            onPress={clearAllData}
            style={[{ backgroundColor: colors.danger, width: '100%', marginBottom: 12 }]}
          />
          <Button
            text="Delete Account"
            onPress={deleteAccount}
            style={[{ backgroundColor: colors.danger, width: '100%', marginBottom: 12 }]}
          />
          <Button
            text="Log Out"
            onPress={logout}
            style={[{ backgroundColor: colors.danger, width: '100%' }]}
          />
        </View>

        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Text style={textStyles.caption}>EnviroMental v1.0.0</Text>
          <Text style={textStyles.caption}>Your mental wellness companion</Text>
        </View>
      </ScrollView>
    </View>
  );
}