import React, { ReactNode } from "react";
import { View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/colors";

interface SafeScreenProps {
  children: ReactNode;
}

const SafeScreen: React.FC<SafeScreenProps> = ({ children }) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    paddingTop: insets.top,
    flex: 1,
    backgroundColor: COLORS.background,
  };

  return <View style={containerStyle}>{children}</View>;
};

export default SafeScreen;
