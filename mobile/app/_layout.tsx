import { Slot } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "react-native";
import { ENV } from "../env";
import SafeScreen from "@/components/SafeScreen";

export default function RootLayout() {
  const publishableKey = ENV.CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <SafeAreaProvider>
        <Text style={{ padding: 20, color: "red" }}>
          ⚠️ Missing Clerk `publishableKey`. Please check your configuration.
        </Text>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeScreen>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <Slot />
        </ClerkProvider>
      </SafeScreen>
    </SafeAreaProvider>
  );
}
