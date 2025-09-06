import { Slot, useRouter, useSegments } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { ENV } from "../env";
import SafeScreen from "@/components/SafeScreen";
import { useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

// Main layout component that determines which screen to show based on auth state
const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inTabsGroup = segments[0] === "(tabs)";

    if (isSignedIn && !inTabsGroup) {
      // Redirect authenticated users to the main app
      router.replace("/(tabs)/home");
    } else if (!isSignedIn && inTabsGroup) {
      // Redirect unauthenticated users to the sign-in screen
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, segments, router]);

  // Show a loading indicator while Clerk is loading
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <LoadingSpinner />
      </View>
    );
  }

  // Render the current screen
  return <Slot />;
};

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
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <SafeScreen>
          <InitialLayout />
        </SafeScreen>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}