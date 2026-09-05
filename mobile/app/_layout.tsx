import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth, ClerkLoaded } from '@clerk/expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { DesignSystemProvider } from '@/src/design';

// Token Cache configuration for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

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
  }, [isSignedIn, isLoaded, segments]);

  // Slot is critical: it initializes the root NavigationContainer
  return <Slot />;
}

export default function RootLayout() {
  if (!publishableKey) {
    console.error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env');
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <DesignSystemProvider>
          <SafeAreaProvider>
            <InitialLayout />
          </SafeAreaProvider>
        </DesignSystemProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}