import Constants from "expo-constants";

export const ENV = {
  CLERK_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    Constants.expoConfig?.extra?.clerkPublishableKey,
  // WARNING: Never put secret keys in client-side code!
  // CLERK_SECRET_KEY should ONLY be in backend/.env
  OPEN_WEATHER_API_KEY:
    process.env.EXPO_PUBLIC_OPEN_WEATHER_API_KEY ||
    Constants.expoConfig?.extra?.openWeatherApiKey,
};