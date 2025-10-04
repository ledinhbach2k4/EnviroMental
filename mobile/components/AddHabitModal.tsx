import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { commonStyles, textStyles, colors, buttonStyles } from '../assets/styles/commonStyles';
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
  const [habitName, setHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>('walk-outline');
  const [error, setError] = useState('');
  const [showMoreIcons, setShowMoreIcons] = useState(false);

  const availableIcons = showMoreIcons ? [...initialIcons, ...additionalIcons] : initialIcons;

  useEffect(() => {
    if (!visible) {
      // Reset state when the modal is closed
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
    onClose(); // Close the modal, which will trigger the useEffect to reset state
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
      <Icon name={item} size={24} color={selectedIcon === item ? colors.primary : colors.textLight} />
    </TouchableOpacity>
  );

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
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <ScrollView
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            maxHeight: '80%',
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={true}
        >
          <View style={[commonStyles.spaceBetween, { marginBottom: 16 }]}>
            <Text style={[textStyles.h3, { color: colors.primary }]}>Add New Habit</Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={[textStyles.body, { marginBottom: 8 }]}>Habit Name</Text>
            <TextInput
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: error ? colors.danger : colors.border,
                fontSize: 16,
                color: colors.text,
              }}
              value={habitName}
              onChangeText={setHabitName}
              placeholder="Enter habit name"
              placeholderTextColor={colors.textLight}
              maxLength={50}
            />
            {error ? (
              <Text style={[textStyles.caption, { color: colors.danger, marginTop: 4 }]}>{error}</Text>
            ) : null}
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={[textStyles.body, { marginBottom: 8 }]}>Select Icon</Text>
            <FlatList
              data={availableIcons}
              renderItem={renderIconItem}
              keyExtractor={(item) => item}
              numColumns={5}
              contentContainerStyle={{ padding: 4 }}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={[buttonStyles.outline, { 
                marginTop: 12, 
                alignSelf: 'center',
                paddingVertical: 8, // Smaller vertical padding
                paddingHorizontal: 16, // Smaller horizontal padding
                borderRadius: 8, // Slightly smaller border radius
              }]}
              onPress={() => setShowMoreIcons(!showMoreIcons)}
            >
              <Text style={[textStyles.buttonOutline, { fontSize: 14 }]}> {/* Smaller font size */}
                {showMoreIcons ? 'Show Less' : 'Show More Icons'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[commonStyles.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
            <TouchableOpacity
              style={[buttonStyles.outline, { flex: 1, marginRight: 8 }]}
              onPress={handleClose}
            >
              <Text style={textStyles.buttonOutline}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[buttonStyles.primary, { flex: 1 }]}
              onPress={handleSave}
            >
              <Text style={textStyles.button}>Save Habit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}