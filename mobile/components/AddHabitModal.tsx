import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import React, { useState } from 'react';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { animationTokens } from '@/src/design/tokens';
import { AnimatedPressable } from './motion';
import Icon from './Icon';

interface AddHabitModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (habit: { name: string; icon: keyof typeof Ionicons.glyphMap }) => void;
}

const initialIcons: (keyof typeof Ionicons.glyphMap)[] = [
  'water-outline',
  'barbell-outline',
  'leaf-outline',
  'moon-outline',
  'book-outline',
  'walk-outline',
  'nutrition-outline',
  'bicycle-outline',
  'medkit-outline',
  'bed-outline',
];

const additionalIcons: (keyof typeof Ionicons.glyphMap)[] = [
  'alarm-outline',
  'brush-outline',
  'cafe-outline',
  'calendar-outline',
  'camera-outline',
  'chatbubble-outline',
  'checkmark-circle-outline',
  'color-palette-outline',
  'document-text-outline',
  'earth-outline',
  'flame-outline',
  'flower-outline',
  'footsteps-outline',
  'game-controller-outline',
  'glasses-outline',
  'heart-outline',
  'musical-notes-outline',
  'pencil-outline',
  'pulse-outline',
  'sunny-outline',
];

export default function AddHabitModal({ visible, onClose, onSave }: AddHabitModalProps) {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  const insets = useSafeAreaInsets();

  const [habitName, setHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>('walk-outline');
  const [error, setError] = useState('');
  const [showMoreIcons, setShowMoreIcons] = useState(false);

  // Reset state when modal is closed without violating react-hooks/set-state-in-effect
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (!visible) {
      setHabitName('');
      setSelectedIcon('water-outline');
      setError('');
      setShowMoreIcons(false);
    }
  }

  const availableIcons = showMoreIcons ? [...initialIcons, ...additionalIcons] : initialIcons;

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSave = () => {
    if (!habitName.trim()) {
      setError('Please enter a habit name');
      return;
    }
    if (habitName.length > 50) {
      setError('Habit name is too long');
      return;
    }
    Keyboard.dismiss();
    onSave({ name: habitName.trim(), icon: selectedIcon });
    onClose();
  };

  const renderIconItem = ({ item }: { item: keyof typeof Ionicons.glyphMap }) => {
    const isSelected = selectedIcon === item;
    return (
      <AnimatedPressable
        key={item}
        scaleTo={0.88}
        opacityTo={0.85}
        springConfig={animationTokens.springs.bouncy}
        style={[
          styles.iconChip,
          {
            backgroundColor: isSelected ? colors.primary + '20' : colors.background,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => setSelectedIcon(item)}
        accessibilityRole="button"
        accessibilityLabel={`Select icon ${item}`}
      >
        <Icon name={item} size={24} color={isSelected ? colors.primary : colors.textMuted} />
      </AnimatedPressable>
    );
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    keyboardAvoidingView: {
      width: '100%',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: Math.max(insets.bottom, spacing.md),
      maxHeight: '85%',
      width: '100%',
      ...shadows.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h3,
      color: colors.primary,
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.body,
      marginBottom: spacing.sm,
      fontWeight: '500',
    },
    input: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: error ? colors.danger : colors.border,
      fontSize: typography.body.fontSize,
      color: colors.text,
    },
    errorText: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xs,
    },
    section: {
      marginBottom: spacing.md,
    },
    sectionTitle: {
      ...typography.body,
      marginBottom: spacing.sm,
      fontWeight: '500',
    },
    iconGridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
      marginBottom: 10,
    },
    iconChip: {
      width: 48,
      height: 48,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      margin: 4,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    buttonCancel: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: 'transparent',
    },
    buttonSave: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.primary,
      ...shadows.sm,
    },
    showMoreButton: {
      alignSelf: 'center',
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.sm,
    },
    showMoreText: {
      ...typography.buttonSmall,
      fontSize: 14,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      statusBarTranslucent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.overlay}>
        {/* Backdrop tap area to dismiss keyboard & close modal */}
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Keyboard avoidance wrapper */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.container}>
            {/* 1. Static Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Add New Habit</Text>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 2. Scrollable Form Content */}
            <ScrollView
              style={{ flexShrink: 1, width: '100%' }}
              contentContainerStyle={{ paddingVertical: spacing.xs }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Habit Name</Text>
                <TextInput
                  style={styles.input}
                  value={habitName}
                  onChangeText={setHabitName}
                  placeholder="Enter habit name"
                  placeholderTextColor={colors.textMuted}
                  maxLength={50}
                  autoCorrect={false}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              {/* Icon Grid with Reanimated layout animation */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Icon</Text>
                <Animated.View
                  layout={LinearTransition.springify().damping(16).stiffness(180)}
                  style={styles.iconGridContainer}
                >
                  {availableIcons.map((icon) => renderIconItem({ item: icon }))}
                </Animated.View>
                <TouchableOpacity
                  style={[styles.showMoreButton, { borderWidth: 1, borderColor: colors.primary }]}
                  onPress={() => setShowMoreIcons(!showMoreIcons)}
                >
                  <Text style={[styles.showMoreText, { color: colors.primary }]}>
                    {showMoreIcons ? 'Show Less' : 'Show More Icons'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* 3. Static Footer Buttons - pinned above keyboard */}
            <View style={styles.buttonRow}>
              <AnimatedPressable
                style={styles.buttonCancel}
                onPress={handleClose}
                scaleTo={animationTokens.micro.buttonPressScale}
              >
                <Text style={[typography.button, { color: colors.primary, textAlign: 'center' }]}>
                  Cancel
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.buttonSave}
                onPress={handleSave}
                scaleTo={animationTokens.micro.buttonPressScale}
              >
                <Text
                  style={[typography.button, { color: colors.textInverse, textAlign: 'center' }]}
                >
                  Save Habit
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
