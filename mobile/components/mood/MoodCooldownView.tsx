import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useDesignSystem, useColors, useTypography, useRadii } from '@/src/design/hooks';
import Icon from '../Icon';

export interface MoodCooldownViewProps {
  reason?: 'limit' | 'time' | null;
  todaysLogCount?: number;
  maxLogsPerDay?: number;
  timeToNextLog?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Apple HIG cooldown & limit reached card rendered when canLog is false.
 * Displays distinct iconography, typography, and countdown timer.
 */
export function MoodCooldownView({
  reason,
  todaysLogCount = 6,
  maxLogsPerDay = 6,
  timeToNextLog,
  style,
  testID,
}: MoodCooldownViewProps) {
  const { theme } = useDesignSystem();
  const isDark = theme.isDark;
  const colors = useColors();
  const typography = useTypography();
  const radii = useRadii();

  const isLimit =
    reason === 'limit' || (todaysLogCount !== undefined && todaysLogCount >= maxLogsPerDay);

  const iconName = isLimit ? 'checkmark-circle' : 'time';
  const title = isLimit ? 'All Done for Today!' : 'A Little Break';

  const defaultLimitMessage = `You've reached the maximum of ${maxLogsPerDay} logs for today. Take time to reflect and log again tomorrow.`;
  const defaultCooldownMessage =
    timeToNextLog || 'Please wait 2 hours before logging your next mood.';

  const bodyMessage = isLimit ? defaultLimitMessage : defaultCooldownMessage;

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isLimit ? `${colors.success}18` : `${colors.primary}18`,
          },
        ]}
      >
        <Icon name={iconName} size={44} color={isLimit ? colors.success : colors.primary} />
      </View>
      <Text style={[typography.h3, styles.title, { color: colors.primary }]}>{title}</Text>
      <Text style={[typography.body, styles.body, { color: colors.textSecondary }]}>
        {bodyMessage}
      </Text>
      {!isLimit && timeToNextLog ? (
        <View
          style={[
            styles.countdownBadge,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: radii.full,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
            {timeToNextLog}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  countdownBadge: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MoodCooldownView;
