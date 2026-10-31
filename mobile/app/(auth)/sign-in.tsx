import React, { useState, useEffect } from 'react';
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
import { useSignIn, useClerk, useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { clearAuthCache } from '../../app/_layout';
import { ENV } from '../../constants/api';

const SignInScreen = () => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  const router = useRouter();

  // Clerk hooks
  const clerkSignIn = useSignIn() as any;
  const clerk = useClerk?.() as any;
  const { isLoaded: authLoaded, getToken } = useAuth();

  // Robustly extract signIn, isLoaded, and setActive across Clerk versions
  const signIn = clerkSignIn?.signIn || clerkSignIn;
  const isLoaded = clerkSignIn?.isLoaded ?? authLoaded;
  const setActive = clerkSignIn?.setActive || clerk?.setActive;

  // Form State
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Verification / MFA State
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [factorType, setFactorType] = useState<'first' | 'second'>('second');
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Diagnostic timeout
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!isLoaded) {
        console.warn('[AUTH TIMEOUT] Clerk isLoaded still false after 8s. Resetting cache...');
        await clearAuthCache();
        Alert.alert(
          'Session Reset',
          'Authentication initialization took longer than expected. Stale cache was cleared.'
        );
      }
    }, 8000);
    return () => clearTimeout(timeoutId);
  }, [isLoaded]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const syncUser = async (): Promise<void> => {
    try {
      const token = await getToken();
      if (!token) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      await fetch(`${ENV.API_URL}/users/sync-user`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (e) {
      console.warn('[AUTH] User backend sync error (non-fatal):', e);
    }
  };

  // Explicit Email Code Dispatch
  const dispatchEmailCode = async (targetSignIn: any, preferredFactor?: 'first' | 'second'): Promise<boolean> => {
    try {
      console.log('[AUTH MFA] Dispatching email verification code...');
      if (preferredFactor === 'first' || targetSignIn.status === 'needs_first_factor') {
        if (typeof targetSignIn.prepareFirstFactor === 'function') {
          const emailFactor = targetSignIn.supportedFirstFactors?.find(
            (f: any) => f.strategy === 'email_code'
          );
          await targetSignIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailFactor?.emailAddressId,
          });
        } else if (targetSignIn.emailCode?.sendCode) {
          await targetSignIn.emailCode.sendCode();
        }
        setFactorType('first');
      } else {
        // Second factor / device trust
        if (typeof targetSignIn.prepareSecondFactor === 'function') {
          await targetSignIn.prepareSecondFactor({ strategy: 'email_code' });
        } else if (typeof targetSignIn.prepareFirstFactor === 'function') {
          await targetSignIn.prepareFirstFactor({ strategy: 'email_code' });
        } else if (targetSignIn.mfa?.sendEmailCode) {
          await targetSignIn.mfa.sendEmailCode();
        } else if (targetSignIn.emailCode?.sendCode) {
          await targetSignIn.emailCode.sendCode();
        }
        setFactorType('second');
      }
      setResendCooldown(60);
      setIsVerifying(true);
      return true;
    } catch (err: any) {
      console.error('[AUTH MFA] Failed to dispatch code:', err);
      const msg = err.errors?.[0]?.message || err.message || 'Failed to send verification email.';
      Alert.alert('Verification Dispatch Error', msg);
      return false;
    }
  };

  const handleSignIn = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    if (!isLoaded || !signIn) {
      Alert.alert('Loading', 'Authentication service is initializing. Please try again.');
      return;
    }

    setLoading(true);
    try {
      console.log('[AUTH] Initiating sign-in for:', trimmedEmail);
      let result = await signIn.create({ identifier: trimmedEmail });
      console.log('[AUTH] signIn.create status:', signIn.status || result?.status);

      // Attempt password
      if (typeof signIn.password === 'function') {
        result = await signIn.password({ password });
      } else if (typeof signIn.attemptFirstFactor === 'function') {
        result = await signIn.attemptFirstFactor({ strategy: 'password', password });
      }

      const currentStatus = signIn.status || result?.status;
      console.log('[AUTH] Post-password status:', currentStatus);

      if (currentStatus === 'complete') {
        const sessionId = signIn.createdSessionId || result?.createdSessionId;
        if (sessionId && typeof setActive === 'function') {
          await setActive({ session: sessionId });
        } else if (typeof signIn.finalize === 'function') {
          await signIn.finalize({ setActive: true });
        }
        await syncUser();
        router.replace('/(tabs)/home' as any);
      } else if (
        currentStatus === 'needs_second_factor' ||
        currentStatus === 'needs_client_trust'
      ) {
        console.log('[AUTH] MFA / Device Trust required. Triggering code dispatch...');
        await dispatchEmailCode(signIn, 'second');
      } else if (currentStatus === 'needs_first_factor') {
        console.log('[AUTH] First factor verification required. Triggering code dispatch...');
        await dispatchEmailCode(signIn, 'first');
      } else {
        const errorMsg =
          signIn.errors?.[0]?.message || `Sign in incomplete. Status: ${currentStatus}`;
        Alert.alert('Sign In Incomplete', errorMsg);
      }
    } catch (err: any) {
      console.error('[AUTH] Sign-in failed:', err);
      const msg = err.errors?.[0]?.message || err.message || 'Invalid credentials or sign-in failed.';
      Alert.alert('Sign In Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (): Promise<void> => {
    const trimmedCode = verificationCode.trim();
    if (!trimmedCode || trimmedCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      console.log('[AUTH MFA] Submitting code for factor:', factorType);
      let result;

      if (factorType === 'second' || signIn.status === 'needs_second_factor' || signIn.status === 'needs_client_trust') {
        if (typeof signIn.attemptSecondFactor === 'function') {
          result = await signIn.attemptSecondFactor({ strategy: 'email_code', code: trimmedCode });
        } else if (signIn.mfa?.verifyEmailCode) {
          result = await signIn.mfa.verifyEmailCode({ code: trimmedCode });
        } else if (typeof signIn.attemptFirstFactor === 'function') {
          result = await signIn.attemptFirstFactor({ strategy: 'email_code', code: trimmedCode });
        }
      } else {
        if (typeof signIn.attemptFirstFactor === 'function') {
          result = await signIn.attemptFirstFactor({ strategy: 'email_code', code: trimmedCode });
        } else if (signIn.emailCode?.verifyCode) {
          result = await signIn.emailCode.verifyCode({ code: trimmedCode });
        }
      }

      const currentStatus = signIn.status || result?.status;
      console.log('[AUTH MFA] Verify result status:', currentStatus);

      if (currentStatus === 'complete') {
        const sessionId = signIn.createdSessionId || result?.createdSessionId;
        if (sessionId && typeof setActive === 'function') {
          await setActive({ session: sessionId });
        } else if (typeof signIn.finalize === 'function') {
          await signIn.finalize({ setActive: true });
        }
        await syncUser();
        router.replace('/(tabs)/home' as any);
      } else {
        Alert.alert('Verification Incomplete', `Status: ${currentStatus}`);
      }
    } catch (err: any) {
      console.error('[AUTH MFA] Verification error:', err);
      const msg = err.errors?.[0]?.message || err.message || 'Invalid or expired verification code.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    if (resendCooldown > 0) return;
    setLoading(true);
    await dispatchEmailCode(signIn, factorType);
    setLoading(false);
    Alert.alert('Code Sent', 'A fresh 6-digit code has been dispatched to your email.');
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
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxxl,
      justifyContent: 'center',
    },
    headerArea: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logoImage: {
      width: 140,
      height: 140,
      marginBottom: spacing.md,
    },
    iconBadge: {
      width: 72,
      height: 72,
      borderRadius: radii.full,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.primary + '30',
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
      marginBottom: spacing.lg,
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
    otpInput: {
      ...typography.h2,
      color: colors.primary,
      letterSpacing: 10,
      textAlign: 'center',
      paddingVertical: spacing.md,
      backgroundColor: colors.backgroundAlt,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
      marginTop: spacing.sm,
    },
    primaryButtonText: {
      ...typography.button,
      color: colors.textInverse,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: spacing.md,
    },
    secondaryButtonText: {
      ...typography.button,
      color: colors.textSecondary,
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
          <View style={styles.headerArea}>
            {isVerifying ? (
              <View style={styles.iconBadge}>
                <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
              </View>
            ) : (
              <Image
                source={require('../../assets/images/i1.png')}
                style={styles.logoImage}
                contentFit="contain"
              />
            )}
            <Text style={styles.title}>
              {isVerifying ? 'Device Verification' : 'Welcome to EnviroMental'}
            </Text>
            <Text style={styles.subtitle}>
              {isVerifying
                ? 'We sent a 6-digit verification code to your email. Enter it below to verify this device.'
                : 'Sign in to continue your mental and environmental wellness journey.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {isVerifying ? (
              /* 6-Digit Code View */
              <View>
                <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="000000"
                  placeholderTextColor={colors.textMuted}
                  value={verificationCode}
                  onChangeText={(val) => setVerificationCode(val.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />

                <TouchableOpacity
                  style={[styles.primaryButton, (loading || verificationCode.length < 6) && styles.buttonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={loading || verificationCode.length < 6}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, resendCooldown > 0 && styles.buttonDisabled]}
                  onPress={handleResendCode}
                  disabled={loading || resendCooldown > 0}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, { borderWidth: 0, marginTop: spacing.sm }]}
                  onPress={() => {
                    setIsVerifying(false);
                    setVerificationCode('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
                    ← Back to Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Password / Identifier View */
              <View>
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
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
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
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
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

                <TouchableOpacity
                  style={[styles.primaryButton, (loading || !isLoaded) && styles.buttonDisabled]}
                  onPress={handleSignIn}
                  disabled={loading || !isLoaded}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer Navigation */}
          {!isVerifying && (
            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => router.push('/(auth)/sign-up' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLinkText}>
                Don&apos;t have an account?{' '}
                <Text style={styles.footerLinkHighlight}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignInScreen;
