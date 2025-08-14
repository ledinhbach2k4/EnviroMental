import React, { ReactNode } from "react";
import { View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/colors";

interface SafeScreenProps {
  children: ReactNode;
  style?: ViewStyle;
}

const SafeScreen: React.FC<SafeScreenProps> = ({ children, style }) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
    flex: 1,
    backgroundColor: COLORS.background,
    ...style,
  };

  return <View style={containerStyle}>{children}</View>;
};

export default SafeScreen;
