import { useSignIn, useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { ENV } from '../../constants/api';

const SignInScreen = () => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { getToken } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSignIn = async (): Promise<void> => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (trimmedEmail.length > 50 || password.length > 50) {
      Alert.alert("Error", "Email or password exceeds 50 characters");
      return;
    }

    if (!isLoaded) return;

    setLoading(true);

    try {
      const signInAttempt = await signIn.create({
        identifier: trimmedEmail,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        await syncUser();
        router.replace("/(tabs)/home" as any);
      } else {
        Alert.alert("Error", "Sign in failed. Please try again.");
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message || "Sign in failed");
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const syncUser = async () => {
    console.log("syncUser called in sign-in.tsx");
    try {
      const token = await getToken();
      console.log("Making syncUser fetch call...");
      await fetch(`${ENV.API_URL}/users/sync-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Failed to sync user:", error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      justifyContent: 'space-between',
    },
    imageContainer: {
      height: '30%',
      marginBottom: spacing.xl,
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      width: 320,
      height: 320,
    },
    title: {
      ...typography.h1,
      color: colors.text,
      textAlign: "center",
      marginBottom: spacing.xl,
    },
    subtitle: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.xl,
    },
    formContainer: {
      flex: 1,
    },
    inputContainer: {
      marginBottom: spacing.lg,
      position: "relative",
    },
    textInput: {
      ...typography.body,
      color: colors.text,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.backgroundAlt,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    eyeButton: {
      position: "absolute",
      right: spacing.md,
      top: spacing.md,
      padding: spacing.xs,
    },
    authButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      ...typography.button,
      color: colors.textInverse,
      textAlign: "center",
    },
    linkContainer: {
      alignItems: "center",
      paddingBottom: spacing.lg,
    },
    linkText: {
      ...typography.body,
      color: colors.textMuted,
    },
    link: {
      color: colors.primary,
      fontWeight: "600",
    },
  });

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/images/i1.png")}
              style={styles.image}
              contentFit="contain"
            />
          </View>

          <Text style={[styles.title, { marginBottom: spacing.sm }]}>Welcome to EnviroMental</Text>
          <Text style={styles.subtitle}>
            Sign in to continue your wellness journey.
          </Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(text) => setEmail(text.trim())}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={50}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                maxLength={50}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.authButton, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{loading ? "Signing In..." : "Sign In"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() => router.push("/(auth)/sign-up" as any)}
            >
              <Text style={styles.linkText}>
                Don&apos;t have an account? <Text style={styles.link}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignInScreen;