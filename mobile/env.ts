import Constants from "expo-constants";

export const ENV = {
  CLERK_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    Constants.expoConfig?.extra?.clerkPublishableKey,
};
