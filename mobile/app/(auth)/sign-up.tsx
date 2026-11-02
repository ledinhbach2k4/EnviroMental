import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignUp, useClerk, useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import Animated, { FadeInDown } from 'react-native-reanimated';
import VerifyEmail from './verify-email';

const SignUpScreen = () => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  const router = useRouter();

  const clerkSignUp = useSignUp() as any;
  useClerk?.();
  const { isLoaded: authLoaded } = useAuth();

  const signUp = clerkSignUp?.signUp || clerkSignUp;
  const isLoaded = clerkSignUp?.isLoaded ?? authLoaded;

  const [email, setEmail] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rePassword, setRePassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingVerification, setPendingVerification] = useState<boolean>(false);

  const handleSignUp = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedUsername = username.trim();

    if (
      !trimmedEmail ||
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedUsername ||
      !password ||
      !rePassword
    ) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== rePassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    if (!isLoaded || !signUp) {
      Alert.alert('Loading', 'Authentication service is initializing. Please try again.');
      return;
    }

    setLoading(true);
    try {
      console.log('[AUTH] Calling signUp.create...');
      await signUp.create({
        emailAddress: trimmedEmail,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        username: trimmedUsername,
        password,
      });

      console.log('[AUTH] Preparing email verification...');
      if (typeof signUp.prepareEmailAddressVerification === 'function') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (signUp.emailCode?.sendCode) {
        await signUp.emailCode.sendCode();
      }

      setPendingVerification(true);
    } catch (err: any) {
      console.error('[AUTH] Sign up error:', err);
      const msg = err.errors?.[0]?.message || err.message || 'Failed to create account.';
      Alert.alert('Sign Up Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <VerifyEmail
        email={email.trim()}
        username={username.trim()}
        firstName={firstName.trim()}
        lastName={lastName.trim()}
        onBack={() => setPendingVerification(false)}
      />
    );
  }

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
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxxl,
      justifyContent: 'center',
    },
    headerArea: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logoImage: {
      width: 120,
      height: 120,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h1,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
      marginBottom: spacing.xl,
    },
    inputGroup: {
      marginBottom: spacing.md,
    },
    inputLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.backgroundAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
    },
    inputIcon: {
      marginRight: spacing.sm,
    },
    textInput: {
      flex: 1,
      ...typography.body,
      color: colors.text,
      paddingVertical: spacing.md,
    },
    eyeButton: {
      padding: spacing.xs,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
      marginTop: spacing.md,
    },
    primaryButtonText: {
      ...typography.button,
      color: colors.textInverse,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    footerLink: {
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    footerLinkText: {
      ...typography.body,
      color: colors.textMuted,
    },
    footerLinkHighlight: {
      color: colors.primary,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(50).springify().damping(20)}
            style={styles.headerArea}
          >
            <Image
              source={require('../../assets/images/i2.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Begin your personalized mental wellness journey today.
            </Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            entering={FadeInDown.delay(120).springify().damping(20)}
            style={styles.card}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter first name"
                  placeholderTextColor={colors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter last name"
                  placeholderTextColor={colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="at-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Choose a username"
                  placeholderTextColor={colors.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Create password (min 8 chars)"
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
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={rePassword}
                  onChangeText={setRePassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  maxLength={50}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, (loading || !isLoaded) && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading || !isLoaded}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign Up</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Footer Navigation */}
          <Animated.View entering={FadeInDown.delay(180).springify().damping(20)}>
            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLinkText}>
                Already have an account? <Text style={styles.footerLinkHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignUpScreen;
