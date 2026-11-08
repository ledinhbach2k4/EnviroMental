import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTypography, useColors } from '@/src/design/hooks';

export interface MoodHeaderProps {
  title?: string;
  subtitle?: string;
  leftAccessory?: React.ReactNode;
  rightAccessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  isDark?: boolean;
  testID?: string;
}

/**
 * Flat, clean navigation header adhering to the global design system.
 * Uses solid colors.surface, safe area insets, and subtle colors.borderLight bottom border.
 */
export function MoodHeader({
  title = 'Mood Tracker',
  subtitle = 'How are you feeling right now?',
  leftAccessory,
  rightAccessory,
  style,
  testID,
}: MoodHeaderProps) {
  const insets = useSafeAreaInsets();
  const typography = useTypography();
  const colors = useColors();

  return (
    <View
      testID={testID}
      style={[
        styles.headerContainer,
        {
          paddingTop: Math.max(insets.top, 16),
          backgroundColor: colors.surface,
          borderBottomColor: colors.borderLight,
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {leftAccessory && <View style={styles.accessoryLeft}>{leftAccessory}</View>}
        <View style={styles.textContainer}>
          <Text style={[typography.h2, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[typography.caption, styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAccessory && <View style={styles.accessoryRight}>{rightAccessory}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    borderBottomWidth: 1,
    zIndex: 100,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 2,
  },
  accessoryLeft: {
    marginRight: 12,
  },
  accessoryRight: {
    marginLeft: 12,
  },
});

export default MoodHeader;
