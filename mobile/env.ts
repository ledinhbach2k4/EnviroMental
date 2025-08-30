import Constants from "expo-constants";

export const ENV = {
  CLERK_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    Constants.expoConfig?.extra?.clerkPublishableKey,
  CLERK_SECRET_KEY:
    process.env.EXPO_PUBLIC_CLERK_SECRET_KEY ||
    Constants.expoConfig?.extra?.clerkSecretKey,
  OPEN_WEATHER_API_KEY:
    process.env.EXPO_PUBLIC_OPEN_WEATHER_API_KEY ||
    Constants.expoConfig?.extra?.openWeatherApiKey,
};
