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
import { useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { useState } from "react";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import VerifyEmail from "./verify-email";

const SignUpScreen = () => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();

  const [email, setEmail] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rePassword, setRePassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingVerification, setPendingVerification] = useState<boolean>(false);

  const handleSignUp = async (): Promise<void> => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !firstName || !lastName || !username || !password || !rePassword) {
      return Alert.alert("Error", "Please fill in all fields");
    }

    if (trimmedEmail.length > 50 || firstName.length > 50 || lastName.length > 50 || username.length > 50 || password.length > 50 || rePassword.length > 50) {
      return Alert.alert("Error", "Fields cannot exceed 50 characters");
    }

    if (password.length < 6) {
      return Alert.alert("Error", "Password must be at least 6 characters");
    }

    if (password !== rePassword) {
      return Alert.alert("Error", "Passwords do not match");
    }

    if (!isLoaded) return;

    setLoading(true);

    try {
      await signUp.create({
        emailAddress: trimmedEmail,
        firstName,
        lastName,
        username,
        password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message || "Failed to create account");
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return <VerifyEmail email={email} username={username} firstName={firstName} lastName={lastName} onBack={() => setPendingVerification(false)} />;
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
      behavior: Platform.OS === "ios" ? "padding" : "height",
      keyboardVerticalOffset: Platform.OS === "ios" ? 64 : 0,
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
    charCount: {
      position: "absolute",
      bottom: 8,
      right: 12,
      fontSize: 12,
      color: colors.textMuted,
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
      paddingBottom: spacing.xl,
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/images/i2.png")}
              style={styles.image}
              contentFit="contain"
            />
          </View>

          <Text style={styles.title}>Create Account</Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter first name"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                maxLength={50}
              />
              <Text style={styles.charCount}>{firstName.length}/50</Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter last name"
                placeholderTextColor={colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                maxLength={50}
              />
              <Text style={styles.charCount}>{lastName.length}/50</Text>
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                maxLength={50}
              />
              <Text style={styles.charCount}>{username.length}/50</Text>
            </View>

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
              <Text style={styles.charCount}>{email.length}/50</Text>
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

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textMuted}
                value={rePassword}
                onChangeText={setRePassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                maxLength={50}
              />
            </View>

            <TouchableOpacity
              style={[styles.authButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? "Creating Account..." : "Sign Up"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkContainer} onPress={() => router.back()}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.link}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignUpScreen;