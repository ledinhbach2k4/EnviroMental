import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import React from 'react';

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) return <Redirect href={'/(tabs)/home' as any} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
        gestureEnabled: true,
      }}
    />
  );
}
