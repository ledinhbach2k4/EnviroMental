import Icon from '@/components/Icon';
import { useAuth, useUser } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleProp, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, commonStyles, textStyles } from '../../assets/styles/commonStyles';
import Button from '../../components/Button';
import { useLogout } from '../../hooks/useLogout';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSharedHabits } from '../../context/HabitsContext';
import { API_URL } from '../../constants/api';

interface MoodEntry {
  createdAt: string;
  [key: string]: any;
}

interface UserStats {
  totalMoodEntries: number;
  currentStreak: number;
  meditationMinutes: number;
  habitsCompleted: number;
}

const calculateMoodStreak = (entries: MoodEntry[]): number => {
  if (!entries || entries.length === 0) {
    return 0;
  }

  const uniqueDays = [
    ...new Set(
      entries.map(entry => new Date(entry.createdAt).toDateString())
    ),
  ].map(dateString => new Date(dateString))
   .sort((a, b) => b.getTime() - a.getTime());

  if (uniqueDays.length === 0) {
    return 0;
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const mostRecentEntryDate = uniqueDays[0];
  if (
    mostRecentEntryDate.toDateString() !== today.toDateString() &&
    mostRecentEntryDate.toDateString() !== yesterday.toDateString()
  ) {
    return 0;
  }

  let streak = 1;
  let lastDate = mostRecentEntryDate;

  for (let i = 1; i < uniqueDays.length; i++) {
    const currentDate = uniqueDays[i];
    const expectedPreviousDate = new Date(lastDate);
    expectedPreviousDate.setDate(lastDate.getDate() - 1);

    if (currentDate.toDateString() === expectedPreviousDate.toDateString()) {
      streak++;
      lastDate = currentDate;
    } else {
      break;
    }
  }

  return streak;
};

const CardContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const AndroidCardContent = ({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) => (
  <View style={style}>{children}</View>
);

export default function Profile() {
  const [userStats, setUserStats] = useState<UserStats>({
    totalMoodEntries: 0,
    currentStreak: 0,
    meditationMinutes: 0,
    habitsCompleted: 0,
  });

  const { user } = useUser();
  const { getToken } = useAuth();
  const { habits } = useSharedHabits();
  const userName = user?.firstName || 'User';
  const userAvatar = user?.imageUrl || 'https://www.gravatar.com/avatar?d=mp';

  const { logout } = useLogout();

  const loadUserStats = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/moods`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let moodEntries: MoodEntry[] = [];
      if (res.ok) {
        moodEntries = await res.json();
      } else {
        console.warn(`Failed to fetch mood stats, status: ${res.status}`);
      }

      const totalMoodEntries = moodEntries.length;
      const currentStreak = calculateMoodStreak(moodEntries);
      const habitsCompleted = habits.filter(habit => habit.completedToday).length;
      const meditationMinutes = 150; // Mock data

      setUserStats({
        totalMoodEntries,
        currentStreak,
        meditationMinutes,
        habitsCompleted,
      });
    } catch (error) {
      console.log('Error loading user stats:', error);
      setUserStats({
        totalMoodEntries: 0,
        currentStreak: 0,
        meditationMinutes: 0,
        habitsCompleted: 0,
      });
    }
  }, [getToken, habits]);

  useFocusEffect(
    useCallback(() => {
      loadUserStats();
    }, [loadUserStats])
  );

  const handleImageSelection = async (pickerResult: ImagePicker.ImagePickerResult) => {
    if (!pickerResult.canceled) {
      const base64Image = `data:image/jpeg;base64,${pickerResult.assets[0].base64}`;
      try {
        if (user) {
          await user.setProfileImage({ file: base64Image });
          Alert.alert('Success', 'Profile image updated successfully!');
        }
      } catch (error) {
        console.error('Error updating profile image:', error);
        Alert.alert('Error', 'Failed to update profile image.');
      }
    }
  };

  const pickImage = () => {
    Alert.alert(
      'Select Image',
      'Choose an option to update your profile picture',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            let result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
              base64: true,
            });
            handleImageSelection(result);
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 1,
              base64: true,
            });
            handleImageSelection(result);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
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
              const token = await getToken();
              if (!token) {
                Alert.alert('Error', 'Authentication required.');
                return;
              }

              const headers = { Authorization: `Bearer ${token}` };

              const [moodsRes, habitsRes] = await Promise.all([
                fetch(`${API_URL}/moods/all`, { method: 'DELETE', headers }),
                fetch(`${API_URL}/habits/all`, { method: 'DELETE', headers }),
              ]);

              if (!moodsRes.ok || !habitsRes.ok) {
                throw new Error('Failed to delete all data from the server.');
              }

              await loadUserStats();

              Alert.alert('Data Cleared', 'All your data has been cleared successfully.');
            } catch (error) {
              console.log('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is permanent and will remove all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) {
                Alert.alert('Error', 'Authentication required.');
                return;
              }

              const headers = { Authorization: `Bearer ${token}` };

              await Promise.all([
                fetch(`${API_URL}/moods/all`, { method: 'DELETE', headers }),
                fetch(`${API_URL}/habits/all`, { method: 'DELETE', headers }),
              ]);

              if (user) {
                await user.delete();
              }

              await logout();

              Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
              router.replace('/(auth)/sign-in');
            } catch (error) {
              console.log('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete your account. Please contact support.');
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

  const CardWrapper = Platform.OS === 'android' ? AndroidCardContent : CardContent;

  return (
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 20, marginBottom: 30, alignItems: 'center' }}>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity onPress={pickImage}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                overflow: 'hidden',
                borderWidth: 3,
                borderColor: colors.primary,
                marginBottom: 12,
              }}>
              <Image source={{ uri: userAvatar }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickImage}
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                backgroundColor: '#fff',
                borderRadius: 20,
                width: 28,
                height: 28,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 3,
              elevation: 3,
            }}>
              <Icon name="create" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={[textStyles.h1, { color: colors.primary }]}>{userName}</Text>
          <Text style={textStyles.bodyLight}>Your wellness journey overview</Text>
        </View>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Your Progress</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <View
                style={[
                  commonStyles.cardSmall,
                  { width: '48%', alignItems: 'center', borderColor: colors.moodHappy + '30' },
                ]}>
                <CardWrapper>
                  <Icon name="happy" size={24} color={colors.moodHappy} style={{ marginBottom: 8 }} />
                  <Text style={[textStyles.h3, { color: colors.moodHappy, textAlign: 'center' }]}>{userStats.totalMoodEntries}</Text>
                  <Text style={textStyles.caption}>Mood Entries</Text>
                </CardWrapper>
              </View>

              <View
                style={[
                  commonStyles.cardSmall,
                  { width: '48%', alignItems: 'center', borderColor: colors.success + '30' },
                ]}>
                <CardWrapper>
                  <Icon name="flame" size={24} color={colors.success} style={{ marginBottom: 8 }} />
                  <Text style={[textStyles.h3, { color: colors.success, textAlign: 'center' }]}>{userStats.currentStreak}</Text>
                  <Text style={textStyles.caption}>Day Streak</Text>
                </CardWrapper>
              </View>

              <View
                style={[
                  commonStyles.cardSmall,
                  { width: '48%', alignItems: 'center', borderColor: colors.primary + '30', marginTop: 12 },
                ]}>
                <CardWrapper>
                  <Icon name="leaf" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
                  <Text style={[textStyles.h3, { color: colors.primary, textAlign: 'center' }]}>{userStats.meditationMinutes}</Text>
                  <Text style={textStyles.caption}>Meditation Min</Text>
                </CardWrapper>
              </View>

              <View
                style={[
                  commonStyles.cardSmall,
                  { width: '48%', alignItems: 'center', borderColor: colors.accent + '30', marginTop: 12 },
                ]}>
                <CardWrapper>
                  <Icon name="checkmark-circle" size={24} color={colors.accent} style={{ marginBottom: 8 }} />
                  <Text style={[textStyles.h3, { color: colors.accent, textAlign: 'center' }]}>{userStats.habitsCompleted}</Text>
                  <Text style={textStyles.caption}>Habits Done</Text>
                </CardWrapper>
              </View>
            </View>
          </CardWrapper>
        </View>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Settings</Text>
            <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]}>
              <CardWrapper>
                <View style={commonStyles.spaceBetween}>
                  <View style={commonStyles.row}>
                    <Icon name="notifications" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                    <Text style={textStyles.body}>Notifications</Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textLight} />
                </View>
              </CardWrapper>
            </TouchableOpacity>

            <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]}>
              <CardWrapper>
                <View style={commonStyles.spaceBetween}>
                  <View style={commonStyles.row}>
                    <Icon name="shield-checkmark" size={24} color={colors.success} style={{ marginRight: 12 }} />
                    <Text style={textStyles.body}>Privacy & Security</Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textLight} />
                </View>
              </CardWrapper>
            </TouchableOpacity>

            <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]} onPress={exportData}>
              <CardWrapper>
                <View style={commonStyles.spaceBetween}>
                  <View style={commonStyles.row}>
                    <Icon name="download" size={24} color={colors.secondary} style={{ marginRight: 12 }} />
                    <Text style={textStyles.body}>Export Data</Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textLight} />
                </View>
              </CardWrapper>
            </TouchableOpacity>
          </CardWrapper>
        </View>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Support</Text>
            <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]} onPress={contactSupport}>
              <CardWrapper>
                <View style={commonStyles.spaceBetween}>
                  <View style={commonStyles.row}>
                    <Icon name="help-circle" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                    <Text style={textStyles.body}>Help & FAQ</Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textLight} />
                </View>
              </CardWrapper>
            </TouchableOpacity>

            <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]} onPress={contactSupport}>
              <CardWrapper>
                <View style={commonStyles.spaceBetween}>
                  <View style={commonStyles.row}>
                    <Icon name="mail" size={24} color={colors.accent} style={{ marginRight: 12 }} />
                    <Text style={textStyles.body}>Contact Support</Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textLight} />
                </View>
              </CardWrapper>
            </TouchableOpacity>

            <TouchableOpacity style={[commonStyles.cardSmall, { marginBottom: 12 }]}>
              <CardWrapper>
                <View style={commonStyles.spaceBetween}>
                  <View style={commonStyles.row}>
                    <Icon name="information-circle" size={24} color={colors.textLight} style={{ marginRight: 12 }} />
                    <Text style={textStyles.body}>About EnviroMental</Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textLight} />
                </View>
              </CardWrapper>
            </TouchableOpacity>
          </CardWrapper>
        </View>

        <View style={[commonStyles.card, { borderColor: colors.danger + '30', marginBottom: 30 }]}>
          <CardWrapper>
            <Text style={[textStyles.h3, { color: colors.danger, marginBottom: 16 }]}>Danger Zone</Text>
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
          </CardWrapper>
        </View>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper>
            <Button text="Log Out" onPress={logout} style={[{ backgroundColor: colors.secondary, width: '100%' }]} />
          </CardWrapper>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Text style={textStyles.caption}>EnviroMental v1.0.0</Text>
          <Text style={textStyles.caption}>Your mental wellness companion</Text>
        </View>
      </ScrollView>
    </View>
  );
}
