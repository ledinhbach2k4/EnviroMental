import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, Platform, StyleSheet } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { useAuth } from '@clerk/clerk-expo';
import { ENV } from '../../constants/api';
import { useFocusEffect } from 'expo-router';
import { isSupported, cancelAllScheduledNotificationsAsync, scheduleNotificationAsync, getPermissionsAsync, requestPermissionsAsync, setNotificationChannelAsync, AndroidImportance } from '@/utils/notifications';
import * as SecureStore from 'expo-secure-store';
import DateTimePicker from '@react-native-community/datetimepicker';

interface MoodEntry {
  id: string;
  moodLevel: number;
  note: string;
  createdAt: string;
  factors: string[];
}

const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
const moodLabels = ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'];

const moodFactors = [
  'Weather', 'Sleep', 'Work', 'Exercise', 'Social', 'Food', 'Stress', 'Health'
];

const MAX_LOGS_PER_DAY = 6;
const LOG_INTERVAL_HOURS = 2;

const NOTIFICATION_SETTINGS_KEY = 'mood_notification_settings';

export default function MoodTracker() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  
  const moodColors = [
    colors.mood.verySad,
    colors.mood.sad,
    colors.mood.neutral,
    colors.mood.happy,
    colors.mood.veryHappy,
  ];

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [moodNote, setMoodNote] = useState('');
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([]);
  const [todaysLogCount, setTodaysLogCount] = useState(0);
  const [lastLogTime, setLastLogTime] = useState<number | null>(null);
  const [timeToNextLog, setTimeToNextLog] = useState('');
  const [lastFetched, setLastFetched] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date(new Date().setHours(20, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const settingsJSON = await SecureStore.getItemAsync(NOTIFICATION_SETTINGS_KEY);
      if (settingsJSON) {
        try {
          const { enabled, time } = JSON.parse(settingsJSON);
          setNotificationsEnabled(enabled);
          setNotificationTime(new Date(time));
        } catch (e) {
          console.error("Failed to parse mood notification settings:", e);
        }
      }
    };
    loadSettings();
  }, []);

  const scheduleNotification = async (time: Date) => {
    if (!isSupported) return;
    await cancelAllScheduledNotificationsAsync();
    const identifier = await scheduleNotificationAsync({
      content: {
        title: "How are you feeling?",
        body: 'Time to log your mood for today!',
        data: { screen: 'mood' },
      },
      trigger: {
        repeats: true,
        hour: time.getHours(),
        minute: time.getMinutes()
      },
    });
    console.log('Scheduled notification with id:', identifier);
  };

  const handlePermissions = async () => {
    if (!isSupported) {
      Alert.alert("Not supported", "Notifications are not available in Expo Go. Please use a development build.");
      return false;
    }
    const { status: existingStatus } = await getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Permission required', 'Please enable notifications in your settings to receive reminders.');
      return false;
    }
    if (Platform.OS === 'android') {
      await setNotificationChannelAsync('default', {
        name: 'default',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    return true;
  };

  const toggleNotifications = async () => {
    if (!isSupported) {
      Alert.alert("Not supported", "Notifications are not available in Expo Go. Please use a development build.");
      setNotificationsEnabled(false);
      return;
    }
    const newState = !notificationsEnabled;
    if (newState) {
      const hasPermission = await handlePermissions();
      if (!hasPermission) {
        setNotificationsEnabled(false);
        return;
      }
      await scheduleNotification(notificationTime);
    } else {
      await cancelAllScheduledNotificationsAsync();
    }
    setNotificationsEnabled(newState);
    await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEY, JSON.stringify({ enabled: newState, time: notificationTime.toISOString() }));
  };

  const onTimeChange = async (event: any, selectedDate?: Date) => {
    if (!isSupported) return;
    const currentDate = selectedDate || notificationTime;
    setShowTimePicker(Platform.OS === 'ios');
    setNotificationTime(currentDate);

    const settings = { enabled: notificationsEnabled, time: currentDate.toISOString() };
    await SecureStore.setItemAsync(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));

    if (notificationsEnabled) {
      await scheduleNotification(currentDate);
    }
  };

  const canLogNow = () => {
    if (todaysLogCount >= MAX_LOGS_PER_DAY) {
      return { canLog: false, reason: 'limit' };
    }
    if (lastLogTime) {
      const hoursSinceLastLog = (Date.now() - lastLogTime) / (1000 * 60 * 60);
      if (hoursSinceLastLog < LOG_INTERVAL_HOURS) {
        return { canLog: false, reason: 'time' };
      }
    }
    return { canLog: true, reason: null };
  };

  useEffect(() => {
    const update = () => {
      if (lastLogTime) {
        const nextLogTime = lastLogTime + LOG_INTERVAL_HOURS * 60 * 60 * 1000;
        const now = Date.now();
        if (now < nextLogTime) {
          const diffMinutes = Math.ceil((nextLogTime - now) / (1000 * 60));
          setTimeToNextLog(`You can log again in ${diffMinutes} minutes.`);
        } else {
          setTimeToNextLog('');
        }
      } else {
        setTimeToNextLog('');
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [lastLogTime]);

  const loadMoodData = useCallback(async (force = false) => {
    if (!getToken) return;

    const now = Date.now();
    if (!force && now - lastFetchedRef.current < 30000) {
      return;
    }

    try {
      const token = await getToken();
      const url = `${ENV.API_URL}/moods`;
      console.log('[MoodTracker] Fetching moods from:', url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`Failed to fetch mood data. Status: ${res.status}, Body: ${errorText}`);
        if (res.status !== 429) Alert.alert('Error', 'Could not load recent mood entries.');
        return;
      }

      const entries: MoodEntry[] = await res.json();
      const sortedEntries = entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentEntries(sortedEntries.slice(0, 5));

      const todayString = new Date().toDateString();
      const todaysEntries = sortedEntries.filter(entry => new Date(entry.createdAt).toDateString() === todayString);

      setTodaysLogCount(todaysEntries.length);

      if (todaysEntries.length > 0) {
        setLastLogTime(new Date(todaysEntries[0].createdAt).getTime());
      } else {
        setLastLogTime(null);
      }
      lastFetchedRef.current = now;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("JSON Parse error:", error);
        Alert.alert('Error', 'Received malformed data from the server.');
      } else {
        console.log('Error loading mood data:', error);
        Alert.alert('Error', 'An unexpected error occurred.');
      }
    }
  }, [getToken]);

  const lastFetchedRef = useRef(0);

  useFocusEffect(useCallback(() => { loadMoodData(); }, [loadMoodData]));

  const saveMoodEntry = async () => {
    if (selectedMood === null) {
      Alert.alert('Please select a mood', 'Choose how you are feeling');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);

    const newEntry = {
      moodLevel: selectedMood,
      note: moodNote,
      factors: selectedFactors,
    };

    try {
      const token = await getToken();
      const url = `${ENV.API_URL}/moods`;
      console.log('[MoodTracker] Saving mood to:', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEntry),
      });

      if (!res.ok) {
        const errorText = await res.text();
        Alert.alert('Error', `Failed to save mood: ${errorText}`);
        return;
      }

      Alert.alert('Mood Saved!', 'Your mood has been recorded.');
      setSelectedMood(null);
      setSelectedFactors([]);
      setMoodNote('');
      await loadMoodData(true);
    } catch (error) {
      console.log('Error saving mood:', error);
      Alert.alert('Error', 'Failed to save your mood entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFactor = (factor: string) => {
    setSelectedFactors(prev =>
      prev.includes(factor)
        ? prev.filter(f => f !== factor)
        : [...prev, factor]
    );
  };

  const getAverageMood = () => {
    if (recentEntries.length === 0) return 0;
    const sum = recentEntries.reduce((acc, entry) => acc + entry.moodLevel, 0);
    return sum / recentEntries.length;
  };

  const { canLog, reason } = canLogNow();

  const styles = StyleSheet.create<{
    container: ViewStyle;
    content: ViewStyle;
    card: ViewStyle;
    cardSmall: ViewStyle;
    row: ViewStyle;
    spaceBetween: ViewStyle;
  }>({
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
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
          <Text style={[typography.h1, { color: colors.primary }]}>
            Mood Tracker 💭
          </Text>
          <Text style={typography.bodySmall}>
            How are you feeling right now?
          </Text>
        </View>

        <View style={[styles.card, { marginBottom: spacing.xxl }]}>
          <View style={styles.spaceBetween}>
            <Text style={[typography.h3, { marginBottom: spacing.lg }]}>Log Your Mood</Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>{todaysLogCount}/{MAX_LOGS_PER_DAY} logged today</Text>
          </View>

          {canLog ? (
            <>
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[typography.body, { marginBottom: spacing.md }]}>How do you feel?</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                  {moodEmojis.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        width: 60, height: 60, borderRadius: 30,
                        backgroundColor: selectedMood === index ? moodColors[index] + '30' : colors.border,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: selectedMood === index ? 2 : 1,
                        borderColor: selectedMood === index ? moodColors[index] : colors.border,
                      }}
                      onPress={() => setSelectedMood(index)}
                      disabled={isSubmitting}
                    >
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedMood !== null && (
                  <Text style={[typography.caption, { textAlign: 'center', color: moodColors[selectedMood] }]}>
                    {moodLabels[selectedMood]}
                  </Text>
                )}
              </View>

              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[typography.body, { marginBottom: spacing.md }]}>What&apos;s affecting your mood?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {moodFactors.map((factor) => (
                    <TouchableOpacity
                      key={factor}
                      style={{
                        paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.full,
                        backgroundColor: selectedFactors.includes(factor) ? colors.primary + '20' : colors.border,
                        borderWidth: 1,
                        borderColor: selectedFactors.includes(factor) ? colors.primary : colors.border,
                        marginRight: spacing.sm, marginBottom: spacing.sm,
                      }}
                      onPress={() => toggleFactor(factor)}
                      disabled={isSubmitting}
                    >
                      <Text style={{ color: selectedFactors.includes(factor) ? colors.primary : colors.textMuted, fontSize: 14 }}>
                        {factor}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button
                text={isSubmitting ? "Saving..." : "Save Mood"}
                onPress={saveMoodEntry}
                style={{ backgroundColor: isSubmitting ? colors.primary + '80' : colors.primary }}
                disabled={isSubmitting}
              />
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
              <Icon name={reason === 'limit' ? 'checkmark-circle' : 'time'} size={40} color={colors.primary} style={{ marginBottom: spacing.md }} />
              <Text style={[typography.h3, { color: colors.primary, marginBottom: spacing.xs }]}>
                {reason === 'limit' ? 'All Done for Today!' : 'A Little Break'}
              </Text>
              <Text style={typography.body}>
                {reason === 'limit'
                  ? 'You&apos;ve reached the maximum of ' + MAX_LOGS_PER_DAY + ' logs for today.'
                  : timeToNextLog}
              </Text>
            </View>
          )}
        </View>

        {recentEntries.length > 0 && (
          <View style={[styles.card, { marginBottom: spacing.xxl }]}>
            <Text style={[typography.h3, { marginBottom: spacing.lg }]}>Your Mood Insights</Text>
            <View style={[styles.cardSmall, { backgroundColor: colors.primary + '10' }]}>
              <View style={styles.spaceBetween}>
                <Text style={[typography.body, { flexShrink: 1, marginRight: spacing.md }]}>Average Mood (last 5 entries)</Text>
                <View style={styles.row}>
                  <Text style={[typography.h3, { color: colors.primary, marginRight: spacing.sm }]}>
                    {moodEmojis[Math.round(getAverageMood())]}
                  </Text>
                  <Text style={[typography.body, { color: colors.primary }]}>
                    {moodLabels[Math.round(getAverageMood())]}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {recentEntries.length > 0 && (
          <View style={[styles.card, { marginBottom: spacing.xxl }]}>
            <Text style={[typography.h3, { marginBottom: spacing.lg }]}>Recent Entries</Text>
            {recentEntries.map((entry) => (
              <View key={entry.id} style={[styles.cardSmall, { marginBottom: spacing.sm }]}>
                <View style={styles.spaceBetween}>
                  <View>
                    <View style={[styles.row, { marginBottom: spacing.xs }]}>
                      <Text style={{ fontSize: 20, marginRight: spacing.sm }}>
                        {moodEmojis[entry.moodLevel]}
                      </Text>
                      <Text style={typography.body}>
                        {moodLabels[entry.moodLevel]}
                      </Text>
                    </View>
                    <Text style={typography.caption}>
                      {new Date(entry.createdAt).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {entry.factors && entry.factors.length > 0 && (
                      <Text style={[typography.caption, { marginTop: spacing.xs }]}>
                        Factors: {entry.factors.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <LinearGradient
          colors={[colors.primary + '20', colors.secondary + '20']}
          style={[styles.card, { marginBottom: spacing.xxl }]}
        >
          <Icon name="bulb" size={24} color={colors.primary} style={{ marginBottom: spacing.sm }} />
          <Text style={[typography.h3, { marginBottom: spacing.sm }]}>Mood Tip</Text>
          <Text style={typography.body}>
            Logging your mood multiple times a day can provide deeper insights into how it fluctuates.
          </Text>
        </LinearGradient>

        <View style={[styles.card, { marginBottom: spacing.xxl }]}>
          <Text style={[typography.h3, { marginBottom: spacing.lg }]}>Daily Reminder</Text>
          {isSupported ? (
            <>
              <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={typography.body}>Enable mood logging reminders</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={'#FFFFFF'}
                />
              </View>
              {notificationsEnabled && (
                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={{ marginTop: spacing.lg }}>
                  <Text style={[typography.body, { color: colors.primary }]}>
                    Reminder time: {notificationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
              Daily reminders are not available in Expo Go. Please use a development build to enable this feature.
            </Text>
          )}
        </View>

      </ScrollView>
      {showTimePicker && (
        <DateTimePicker
          value={notificationTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={onTimeChange}
        />
      )}
    </View>
  );
}