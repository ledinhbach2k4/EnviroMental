import React from 'react';
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import Icon from '../components/Icon';

export default function ForumScreen() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
    },
    backButton: {
      marginBottom: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      ...shadows.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>

      <Text style={[typography.h1, { marginBottom: spacing.sm }]}>
        Community Forum
      </Text>
      <Text style={[typography.body, { marginBottom: spacing.xl }]}>
        Connect with others and share your experiences.
      </Text>

      <View style={styles.card}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.lg }} />
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
          No posts yet. Be the first to start a conversation!
        </Text>
      </View>
    </ScrollView>
  );
}