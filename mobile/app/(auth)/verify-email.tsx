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
} from "react-native";
import { Image } from "expo-image";

import { authStyles } from "../../assets/styles/auth.styles";

import { API_URL } from '../../constants/api';

interface VerifyEmailProps {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  onBack: () => void;
}

const VerifyEmail = ({ email, username, firstName, lastName, onBack }: VerifyEmailProps) => {
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
        await setActive({ session: signUpAttempt.createdSessionId });
        await syncUser(); // Call syncUser after successful verification

        await signUp.update({
          username,
          firstName,
          lastName
        });
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
      await fetch(`${API_URL}/users/sync-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Failed to sync user:", error);
    }
  };

  return (
    <View style={authStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Container */}
          <View style={authStyles.imageContainer}>
            <Image
              source={require("../../assets/images/i3.png")}
              style={authStyles.image}
              contentFit="contain"
            />
          </View>

          {/* Title */}
          <Text style={authStyles.title}>Verify Your Email</Text>
          <Text style={authStyles.subtitle}>
            We&apos;ve sent a verification code to {email}
          </Text>

          <View style={authStyles.formContainer}>
            {/* Verification Code Input */}
            <View style={authStyles.inputContainer}>
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
                    <View style={authStyles.otpContainer}>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                        <View key={index} style={authStyles.otpBox}>
                        <Text style={authStyles.otpText}>
                            {code[index] || ''}
                        </Text>
                        </View>
                    ))}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[authStyles.authButton, loading && authStyles.buttonDisabled]}
              onPress={handleVerification}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={authStyles.buttonText}>
                {loading ? "Verifying..." : "Verify Email"}
              </Text>
            </TouchableOpacity>

            {/* Back to Sign Up */}
            <TouchableOpacity style={authStyles.linkContainer} onPress={onBack}>
              <Text style={authStyles.linkText}>
                <Text style={authStyles.link}>Back to Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default VerifyEmail;