import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkFirstLaunch = async () => {
      try {
        const stored = await AsyncStorage.getItem('isFirstLaunch');
        if (stored === null) {
          // First ever run on this device
          await AsyncStorage.setItem('isFirstLaunch', 'false');
          if (mounted) setIsFirstLaunch(true);
        } else {
          if (mounted) setIsFirstLaunch(false);
        }
      } catch (e) {
        // Fail-safe: treat as not-first-launch to avoid blocking
        if (mounted) setIsFirstLaunch(false);
      }
    };

    checkFirstLaunch();

    return () => {
      mounted = false;
    };
  }, []);

  if (!isLoaded || isFirstLaunch === null) return null;

  if (isSignedIn) return <Redirect href="/(tabs)/home" />;
  return <Redirect href={isFirstLaunch ? "/welcome" : "/(auth)/sign-in"} />;
}
