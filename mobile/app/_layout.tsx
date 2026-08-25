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

// Main layout component that determines which screen to show based on auth state
const InitialLayout = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const listenerRef = useRef<any>(null);
  const coldStartHandledRef = useRef(false);

  // Configure the notification handler for the entire app (no-op in Expo Go)
  useEffect(() => {
    if (isSupported) {
      setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  }, []);

  // Register notification category and set up response listener once app is loaded
  useEffect(() => {
    if (!isLoaded || !isSupported) return;

    let mounted = true;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Register MOOD_REMINDER category with 5 mood actions
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
          await Notifications.setNotificationCategoryAsync('MOOD_REMINDER', [
            {
              identifier: '0',
              buttonTitle: '😫 Very Sad',
              options: { opensAppToForeground: true },
            },
            {
              identifier: '1',
              buttonTitle: '🙁 Sad',
              options: { opensAppToForeground: true },
            },
            {
              identifier: '2',
              buttonTitle: '😐 Neutral',
              options: { opensAppToForeground: true },
            },
            {
              identifier: '3',
              buttonTitle: '🙂 Happy',
              options: { opensAppToForeground: true },
            },
            {
              identifier: '4',
              buttonTitle: '😄 Very Happy',
              options: { opensAppToForeground: true },
            },
          ]);
        }

        // Handle cold start: app launched from killed state via notification action
        if (!coldStartHandledRef.current) {
          const response = await Notifications.getLastNotificationResponseAsync();
          coldStartHandledRef.current = true;
          if (response?.actionIdentifier && response.actionIdentifier !== 'DEFAULT') {
            const actionId = response.actionIdentifier;
            if (actionId >= '0' && actionId <= '4') {
              // Defer navigation until router is ready
              setTimeout(() => {
                if (mounted) {
                  router.replace(`/(tabs)/mood?presetMood=${actionId}`);
                }
              }, 0);
            }
          }
        }

        // Set up notification response listener for foreground/background taps
        listenerRef.current = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const actionId = response.actionIdentifier;
            if (actionId >= '0' && actionId <= '4') {
              router.replace(`/(tabs)/mood?presetMood=${actionId}`);
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
            <SafeScreen>
              <InitialLayout />
            </SafeScreen>
          </DesignSystemProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}