import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, Platform, ScrollView, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
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

  const [habitName, setHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>('walk-outline');
  const [error, setError] = useState('');
  const [showMoreIcons, setShowMoreIcons] = useState(false);

  const availableIcons = showMoreIcons ? [...initialIcons, ...additionalIcons] : initialIcons;

  useEffect(() => {
    if (!visible) {
      setHabitName('');
      setSelectedIcon('water-outline');
      setError('');
      setShowMoreIcons(false);
    }
  }, [visible]);

  const handleSave = () => {
    if (!habitName.trim()) {
      setError('Please enter a habit name');
      return;
    }
    if (habitName.length > 50) {
      setError('Habit name is too long');
      return;
    }
    onSave({ name: habitName.trim(), icon: selectedIcon });
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const renderIconItem = ({ item }: { item: keyof typeof Ionicons.glyphMap }) => (
    <TouchableOpacity
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: selectedIcon === item ? colors.primary + '20' : colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 6,
        borderWidth: selectedIcon === item ? 2 : 1,
        borderColor: selectedIcon === item ? colors.primary : colors.border,
      }}
      onPress={() => setSelectedIcon(item)}
    >
      <Icon name={item} size={24} color={selectedIcon === item ? colors.primary : colors.textMuted} />
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
      maxHeight: '80%',
      ...shadows.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
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
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.body,
      marginBottom: spacing.sm,
    },
    flatList: {
      padding: spacing.sm,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    buttonCancel: {
      flex: 1,
      marginRight: spacing.sm,
    },
    buttonSave: {
      flex: 1,
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
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={FadeInDown}
        exiting={FadeOut}
        style={styles.overlay}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Add New Habit</Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Habit Name</Text>
            <TextInput
              style={styles.input}
              value={habitName}
              onChangeText={setHabitName}
              placeholder="Enter habit name"
              placeholderTextColor={colors.textMuted}
              maxLength={50}
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Icon</Text>
            <FlatList
              data={availableIcons}
              renderItem={renderIconItem}
              keyExtractor={(item) => item}
              numColumns={5}
              contentContainerStyle={styles.flatList}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={[styles.showMoreButton, { borderWidth: 1, borderColor: colors.primary }]}
              onPress={() => setShowMoreIcons(!showMoreIcons)}
            >
              <Text style={[styles.showMoreText, { color: colors.primary }]}>
                {showMoreIcons ? 'Show Less' : 'Show More Icons'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.buttonCancel, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary }]}
              onPress={handleClose}
            >
              <Text style={[typography.button, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.buttonSave, { backgroundColor: colors.primary, borderRadius: radii.lg, paddingVertical: spacing.md, alignItems: 'center', ...shadows.sm }]}
              onPress={handleSave}
            >
              <Text style={typography.button}>Save Habit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}