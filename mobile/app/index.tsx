import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return <Redirect href={isSignedIn ? "/(tabs)/home" : "/(auth)/sign-in"} />;
}
