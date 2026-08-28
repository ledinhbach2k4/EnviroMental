import { Slot, useRouter, useSegments } from "expo-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, View, Platform } from "react-native";
import { ENV } from "../env";
import SafeScreen from "@/components/SafeScreen";
import { useEffect, useRef } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { setNotificationHandler, isSupported } from "@/utils/notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DesignSystemProvider } from "@/src/design";
import { NotificationProvider } from "@/context/NotificationContext";

import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Main layout component that determines which screen to show based on auth state
const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const listenerRef = useRef<any>(null);
  const coldStartHandledRef = useRef(false);

  // Register empty MOOD_REMINDER category (no action buttons) to avoid Android 3-action limit
  // Tapping the notification body will trigger the default content intent (opens app)
  useEffect(() => {
    if (!isLoaded || !isSupported) return;

    let mounted = true;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Register MOOD_REMINDER category with NO action buttons
        // This avoids Android's 3-action limit while keeping the category for identification
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
          await Notifications.setNotificationCategoryAsync('MOOD_REMINDER', []);
        }

        // Handle cold start: app launched from killed state via notification tap
        if (!coldStartHandledRef.current) {
          const response = await Notifications.getLastNotificationResponseAsync();
          coldStartHandledRef.current = true;
          if (response) {
            // Navigate to mood screen for any tap (DEFAULT action or category tap)
            setTimeout(() => {
              if (mounted) {
                router.replace('/(tabs)/mood');
              }
            }, 0);
          }
        }

        // Set up notification response listener for foreground/background taps
        // actionIdentifier === 'DEFAULT' means user tapped the notification body
        listenerRef.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            if (response.actionIdentifier === 'DEFAULT' || response.notification.request.content.categoryIdentifier === 'MOOD_REMINDER') {
              router.replace('/(tabs)/mood');
            }
          }
        );
      } catch (e) {
        console.error('Failed to initialize notifications:', e);
      }
    })();

    return () => {
      mounted = false;
      if (listenerRef.current) {
        listenerRef.current.remove();
        listenerRef.current = null;
      }
    };
  }, [isLoaded, isSupported, router]);

  useEffect(() => {
    if (!isLoaded) return;

    const inTabsGroup = segments[0] === "(tabs)";

    if (isSignedIn && !inTabsGroup) {
      // Redirect authenticated users to the main app
      router.replace("/(tabs)/home");
    } else if (!isSignedIn && inTabsGroup) {
      // Redirect unauthenticated users to the sign-in screen
      router.replace("/(auth)/sign-in");
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
        <GestureHandlerRootView style={{ flex: 1 }}>
          <DesignSystemProvider>
            <NotificationProvider>
              <SafeScreen>
                <InitialLayout />
              </SafeScreen>
            </NotificationProvider>
          </DesignSystemProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}