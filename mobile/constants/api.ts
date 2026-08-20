import Constants from "expo-constants";

export const ENV = {
  API_URL:
    process.env.EXPO_PUBLIC_API_URL ||
    Constants.expoConfig?.extra?.apiUrl ||
    "https://enviromental-app-api.onrender.com/api",
};