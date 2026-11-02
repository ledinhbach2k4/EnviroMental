import React from 'react';
import { View, Text, StyleSheet, Switch, StyleProp, ViewStyle } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { useNotifications } from '@/context/NotificationContext';

interface ProfileNotificationSectionProps {
  style?: StyleProp<ViewStyle>;
}

export const ProfileNotificationSection = ({ style }: ProfileNotificationSectionProps) => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const { isReminderEnabled, setIsReminderEnabled, isLoading, hasPermission } = useNotifications();

  if (isLoading) {
    return (
      <View style={[styles.section, style, { opacity: 0.6 }]}>
        <Text style={[typography.h3, { color: colors.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  const dynamicStyles = {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
  };

  return (
    <View style={[styles.section, style]}>
      <Text style={[typography.h3, { marginBottom: spacing.lg, color: colors.text }]}>
        Notifications
      </Text>

      <Animated.View
        layout={LinearTransition.springify().damping(16).stiffness(180)}
        style={[styles.card, dynamicStyles.card, shadows.sm]}
      >
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[typography.body, { color: colors.text }]}>Daily Mood Reminder</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
              Receive prompts when you become eligible to log your mood
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
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  card: {
    overflow: 'hidden',
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
});

export default ProfileNotificationSection;
