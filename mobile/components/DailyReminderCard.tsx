import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { useNotifications } from '@/context/NotificationContext';

interface DailyReminderCardProps {
  style?: any;
}

export const DailyReminderCard = ({ style }: DailyReminderCardProps) => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const { isReminderEnabled, setIsReminderEnabled, isLoading, hasPermission } = useNotifications();

  if (isLoading) {
    return (
      <View style={[styles.card, style, { opacity: 0.6 }]}>
        <Text style={[typography.body, { color: colors.textMuted }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, style, shadows.sm]}>
      <View style={styles.header}>
        <Text style={[typography.h3, { color: colors.primary }]}>Daily Reminder</Text>
      </View>

      <Text style={[typography.body, { marginBottom: spacing.md, color: colors.text }]}>
        Get a daily prompt to log your mood and track patterns over time.
      </Text>

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={[typography.body, { color: colors.text }]}>Enable Reminder</Text>
          {!hasPermission && (
            <Text style={[typography.caption, { color: colors.warning, marginTop: 2 }]}>
              Permission required
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
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  toggleInfo: {
    flex: 1,
  },
});