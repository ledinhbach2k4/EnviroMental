import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDesignSystem, useColors, useTypography, useRadii } from '@/src/design/hooks';
import { FrostedCard } from './FrostedCard';

export interface MoodNoteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  title?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Apple HIG frosted text input for personal reflection notes.
 * Uses FrostedCard with blur material, clean multiline auto-height,
 * interactive clear button, and character counter.
 */
export function MoodNoteInput({
  value,
  onChangeText,
  placeholder = 'Add a note about how you feel... (optional)',
  disabled = false,
  maxLength = 280,
  title,
  style,
  testID,
}: MoodNoteInputProps) {
  const { theme } = useDesignSystem();
  const isDark = theme.isDark;
  const colors = useColors();
  const typography = useTypography();
  const radii = useRadii();

  return (
    <View style={[styles.container, style]} testID={testID}>
      {title ? (
        <Text style={[typography.body, styles.title, { color: colors.text }]}>{title}</Text>
      ) : null}
      <FrostedCard
        borderRadius={radii.md}
        intensity={Platform.OS === 'ios' ? 25 : 15}
        contentStyle={styles.cardContent}
        style={styles.frostedWrapper}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          multiline
          maxLength={maxLength}
          textAlignVertical="top"
          style={[typography.body, styles.input, { color: colors.text }]}
          accessibilityLabel="Mood reflection note"
        />
        {value.length > 0 && !disabled ? (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear note"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={isDark ? 'rgba(255, 255, 255, 0.45)' : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </FrostedCard>
      {maxLength ? (
        <Text style={[typography.caption, styles.charCounter, { color: colors.textMuted }]}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    marginBottom: 8,
    fontWeight: '500',
  },
  frostedWrapper: {
    width: '100%',
  },
  cardContent: {
    padding: 12,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    minHeight: 64,
    paddingTop: 0,
    paddingBottom: 0,
    fontSize: 15,
    lineHeight: 20,
  },
  clearButton: {
    padding: 2,
    marginLeft: 6,
  },
  charCounter: {
    textAlign: 'right',
    marginTop: 4,
    fontSize: 12,
  },
});

export default MoodNoteInput;
