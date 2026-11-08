import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth, ClerkLoaded } from '@clerk/expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { DesignSystemProvider } from '@/src/design';
import { ENV } from '../constants/api';
import { initGlobalLogger } from '../utils/logger';
import {
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
} from '../utils/notifications';

// Token Cache configuration for Clerk - Bulletproof with verbose logging & corruption recovery
const tokenCache = {
  async getToken(key: string) {
    try {
      console.log(`[AUTH DEBUG] Attempting to read token: ${key}`);
      const item = await SecureStore.getItemAsync(key);
      console.log(`[AUTH DEBUG] Token read success. Exists: ${!!item}`);
      return item;
    } catch (error) {
      console.error(`[AUTH FATAL] SecureStore read failed for ${key}:`, error);
      try {
        await SecureStore.deleteItemAsync(key);
        console.log(`[AUTH RECOVERY] Deleted corrupted token: ${key}`);
      } catch (e) {
        console.error(`[AUTH FATAL] Failed to delete corrupted token: ${key}`, e);
      }
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      console.log(`[AUTH DEBUG] Saving token: ${key}`);
      return await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`[AUTH FATAL] SecureStore save failed for ${key}:`, error);
    }
  },
};

export async function clearAuthCache() {
  try {
    await SecureStore.deleteItemAsync('__clerk_client_jwt');
    console.log('[AUTH DEBUG] Cleared stale __clerk_client_jwt from SecureStore');
  } catch (e) {
    console.error('[AUTH ERROR] Failed to clear SecureStore:', e);
  }
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Hard validation - throw if missing to force visible crash rather than silent hang
if (!publishableKey) {
  console.error('FATAL: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing. Check your .env file.');
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing. Check your .env file.');
}

// Startup logging
console.log(
  '[STARTUP] EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY loaded:',
  publishableKey ? 'YES (length: ' + publishableKey.length + ')' : 'NO'
);
console.log(
  '[STARTUP] EXPO_PUBLIC_API_URL loaded:',
  process.env.EXPO_PUBLIC_API_URL || 'NOT SET (using fallback)'
);
console.log('[STARTUP] ENV.API_URL resolved to:', ENV.API_URL);
console.log(
  '[STARTUP] Expo Constants expoConfig.extra:',
  JSON.stringify(Constants.expoConfig?.extra, null, 2)
);

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inTabsGroup = segments[0] === '(tabs)';
    const inForumGroup = segments[0] === 'forum';
    const inAuthGroup = segments[0] === '(auth)';

    // Hack/Fix: setTimeout pushes the routing action to the end of the event loop,
    // strictly guaranteeing that the NavigationContainer is fully mounted first.
    setTimeout(() => {
      if (isSignedIn && !inTabsGroup && !inForumGroup) {
        router.replace('/(tabs)/home');
      } else if (!isSignedIn && !inAuthGroup) {
        // Adjust this path if your sign-in screen is located elsewhere
        router.replace('/(auth)/sign-in');
      }
    }, 0);
  }, [isSignedIn, isLoaded, segments, router]);

  // Global Notification Deep-Linking Listener
  useEffect(() => {
    if (!isLoaded) return;

    const handleNotificationResponse = (response: any) => {
      const data = response?.notification?.request?.content?.data;
      const targetUrl = data?.url || (data?.screen === 'mood' ? '/(tabs)/mood' : null);
      if (targetUrl) {
        console.log(`[Notification DeepLink] Navigating to: ${targetUrl}`);
        if (isSignedIn) {
          router.push(targetUrl as any);
        }
      }
    };

    const subscription = addNotificationResponseReceivedListener(handleNotificationResponse);

    // If app was opened by tapping a notification from a quit state
    const timer = setTimeout(() => {
      getLastNotificationResponseAsync().then((response) => {
        if (response) {
          handleNotificationResponse(response);
        }
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [isLoaded, isSignedIn, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="forum/index"
        options={{
          animation: 'slide_from_right',
          animationDuration: 300,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="emergency"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initGlobalLogger();
  }, []);

  if (!publishableKey) {
    console.error('[STARTUP] Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env');
    return null;
  }

  console.log(
    '[STARTUP] ClerkProvider mounting with publishableKey:',
    publishableKey.substring(0, 20) + '...'
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <DesignSystemProvider>
            <SafeAreaProvider>
              <InitialLayout />
            </SafeAreaProvider>
          </DesignSystemProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}
