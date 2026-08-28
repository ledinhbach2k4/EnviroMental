import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, Platform, TouchableOpacity } from 'react-native';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { useNotifications } from '@/context/NotificationContext';
import Button from './Button';
import DateTimePicker from '@react-native-community/datetimepicker';

interface ProfileNotificationSectionProps {
  style?: any;
}

export const ProfileNotificationSection = ({ style }: ProfileNotificationSectionProps) => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const { isReminderEnabled, setIsReminderEnabled, notificationTime, setNotificationTime, isLoading, hasPermission, testNotification } = useNotifications();

  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleTestNotification = async () => {
    try {
      await testNotification();
      Alert.alert(
        'Test Scheduled',
        'Close the app or wait 3 seconds to see the notification. Tapping it will open the mood screen.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule test notification');
    }
  };

  const handleTimeChange = async (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      await setNotificationTime(selectedDate.getHours(), selectedDate.getMinutes());
    }
    setShowTimePicker(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.section, style, { opacity: 0.6 }]}>
        <Text style={[typography.h3, { color: colors.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.section, style]}>
      <Text style={[typography.h3, { marginBottom: spacing.lg, color: colors.text }]}>Notifications</Text>

      <View style={[styles.card, shadows.sm]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[typography.body, { color: colors.text }]}>Daily Mood Reminder</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              Receive a daily prompt to log your mood
            </Text>
            {!hasPermission && (
              <Text style={[typography.caption, { color: colors.warning, marginTop: 4 }]}>
                ⚠️ System permission not granted. Enable in device settings.
              </Text>
            )}
          </View>
          <Switch
            value={isReminderEnabled}
            onValueChange={setIsReminderEnabled}
            disabled={!hasPermission && !isReminderEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isReminderEnabled ? '#FFFFFF' : colors.border}
          />
        </View>

        {isReminderEnabled && hasPermission && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeRow}>
              <View style={styles.timeInfo}>
                <Text style={[typography.body, { color: colors.text }]}>Reminder Time</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Daily at {notificationTime.hour.toString().padStart(2, '0')}:{notificationTime.minute.toString().padStart(2, '0')}
                </Text>
              </View>
              <Text style={[typography.caption, { color: colors.primary }]}>Change</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.buttonRow}>
          <Button
            text="Test Notification Now"
            onPress={handleTestNotification}
            disabled={!isReminderEnabled || !hasPermission}
            style={{
              backgroundColor: isReminderEnabled && hasPermission ? colors.secondary : colors.border,
            }}
            textStyle={{
              color: isReminderEnabled && hasPermission ? colors.textOnSecondary : colors.textMuted,
            }}
          />
        </View>
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={new Date(2000, 0, 1, notificationTime.hour, notificationTime.minute)}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  timeInfo: {
    flex: 1,
  },
  buttonRow: {
    padding: 16,
    paddingTop: 8,
  },
});