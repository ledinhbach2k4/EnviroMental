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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSignUp, useClerk, useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
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
  const router = useRouter();

  const clerkSignUp = useSignUp() as any;
  const clerk = useClerk?.() as any;
  const { isLoaded: authLoaded, getToken } = useAuth();

  const signUp = clerkSignUp?.signUp || clerkSignUp;
  const isLoaded = clerkSignUp?.isLoaded ?? authLoaded;
  const setActive = clerkSignUp?.setActive || clerk?.setActive;

  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(60);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const syncUser = async () => {
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
      console.warn('[AUTH] syncUser failed (non-fatal):', e);
    }
  };

  const handleVerification = async (): Promise<void> => {
    const trimmedCode = code.trim();
    if (!trimmedCode || trimmedCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit verification code.');
      return;
    }

    if (!isLoaded || !signUp) {
      Alert.alert('Loading', 'Authentication service is initializing. Please try again.');
      return;
    }

    setLoading(true);
    try {
      console.log('[AUTH] Calling signUp.attemptEmailAddressVerification with code...');
      let signUpAttempt;
      if (typeof signUp.attemptEmailAddressVerification === 'function') {
        signUpAttempt = await signUp.attemptEmailAddressVerification({ code: trimmedCode });
      } else if (signUp.emailCode?.verifyCode) {
        signUpAttempt = await signUp.emailCode.verifyCode({ code: trimmedCode });
      }

      const currentStatus = signUp.status || signUpAttempt?.status;
      console.log('[AUTH] Verification result status:', currentStatus);

      if (currentStatus === 'complete') {
        if (typeof signUp.update === 'function') {
          try {
            await signUp.update({ username, firstName, lastName });
          } catch (updateErr) {
            console.warn('[AUTH] signUp.update profile warning:', updateErr);
          }
        }

        const sessionId = signUp.createdSessionId || signUpAttempt?.createdSessionId;
        if (sessionId && typeof setActive === 'function') {
          await setActive({ session: sessionId });
        } else if (typeof signUp.finalize === 'function') {
          await signUp.finalize({ setActive: true });
        }

        await syncUser();
        router.replace('/(tabs)/home' as any);
      } else {
        Alert.alert('Verification Pending', `Status: ${currentStatus}`);
      }
    } catch (err: any) {
      console.error('[AUTH] Verification error:', err);
      const msg =
        err.errors?.[0]?.message || err.message || 'Verification failed. Please check the code.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      if (typeof signUp.prepareEmailAddressVerification === 'function') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (signUp.emailCode?.sendCode) {
        await signUp.emailCode.sendCode();
      }
      setResendCooldown(60);
      Alert.alert('Code Sent', 'A fresh verification code was dispatched to your email.');
    } catch (err: any) {
      console.error('[AUTH] Resend verification error:', err);
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
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
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxxl,
      justifyContent: 'center',
    },
    headerArea: {
      alignItems: 'center',
      marginBottom: spacing.xl,
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
    inputLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
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
            <View style={styles.iconBadge}>
              <Ionicons name="mail" size={36} color={colors.primary} />
            </View>
            <Text style={styles.title}>Verify Email</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit verification code to {email}. Enter it below to activate your
              account.
            </Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            entering={FadeInDown.delay(120).springify().damping(20)}
            style={styles.card}
          >
            <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor={colors.textMuted}
              value={code}
              onChangeText={(val) => setCode(val.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.primaryButton, (loading || code.length < 6) && styles.buttonDisabled]}
              onPress={handleVerification}
              disabled={loading || code.length < 6}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Complete</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, resendCooldown > 0 && styles.buttonDisabled]}
              onPress={handleResend}
              disabled={loading || resendCooldown > 0}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderWidth: 0, marginTop: spacing.sm }]}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
                ← Back to Edit Information
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default VerifyEmail;
