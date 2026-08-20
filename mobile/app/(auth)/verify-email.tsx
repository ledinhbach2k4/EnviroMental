import { useSignUp, useAuth } from '@clerk/clerk-expo';
import { useRef, useState } from "react";
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
import { Image } from "expo-image";
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { ENV } from '../../constants/api';

interface VerifyEmailProps {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  onBack: () => void;
}

const VerifyEmail = ({ email, username, firstName, lastName, onBack }: VerifyEmailProps) => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const { isLoaded, signUp, setActive } = useSignUp();
  const { getToken } = useAuth();
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);

  const handlePressOnOtpContainer = () => inputRef.current?.focus();

  const handleVerification = async (): Promise<void> => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code });

      if (signUpAttempt.status === "complete") {
        await signUp.update({
          username,
          firstName,
          lastName
        });
        await setActive({ session: signUpAttempt.createdSessionId });
        await syncUser();
      } else {
        Alert.alert("Error", "Verification failed. Please try again.");
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err: any) {
      Alert.alert("Error", err.errors?.[0]?.message || "Verification failed");
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const syncUser = async () => {
    console.log("syncUser called in verify-email.tsx");
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
      marginBottom: spacing.lg,
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
    otpContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: spacing.lg,
    },
    otpBox: {
      width: 50,
      height: 60,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
    },
    otpText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
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
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/images/i3.png")}
              style={styles.image}
              contentFit="contain"
            />
          </View>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We&apos;ve sent a verification code to {email}
          </Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
                <TextInput
                    ref={inputRef}
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                    value={code}
                    onChangeText={setCode}
                    maxLength={6}
                    keyboardType="number-pad"
                    autoFocus={true}
                />
                <TouchableOpacity onPress={handlePressOnOtpContainer} activeOpacity={1}>
                    <View style={styles.otpContainer}>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                        <View key={index} style={styles.otpBox}>
                        <Text style={styles.otpText}>
                            {code[index] || ''}
                        </Text>
                        </View>
                    ))}
                    </View>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.authButton, loading && styles.buttonDisabled]}
              onPress={handleVerification}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verifying..." : "Verify Email"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkContainer} onPress={onBack}>
              <Text style={styles.linkText}>
                <Text style={styles.link}>Back to Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default VerifyEmail;