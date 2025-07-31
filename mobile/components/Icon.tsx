import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../assets/styles/commonStyles';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  style?: ViewStyle & { color?: string }; // Hỗ trợ color truyền từ tab
}

export default function Icon({ name, size = 40, style = {} }: IconProps) {
  const { color = colors.primary, ...restStyle } = style || {};

  return (
    <View style={[styles.iconContainer, restStyle]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
