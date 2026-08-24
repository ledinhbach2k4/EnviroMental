import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';

interface CortisolBreakdownItem {
  score: number;
  weight: number;
  trend?: 'improving' | 'worsening' | null;
  streak?: number;
}

interface CortisolBreakdown {
  mood: CortisolBreakdownItem | null;
  habits: CortisolBreakdownItem | null;
  environment: CortisolBreakdownItem | null;
}

interface CortisolGaugeCardProps {
  score: number | null;
  category: 'low' | 'medium' | 'high' | 'unknown';
  label: string;
  breakdown: CortisolBreakdown;
  message: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  warnings?: string[];
  circadianMultiplier?: number;
  timestamp?: string;
}

// Helper to capitalize first letter
const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const CortisolGaugeCard: React.FC<CortisolGaugeCardProps> = ({
  score,
  category,
  label,
  breakdown,
  message,
  loading = false,
  error = null,
  onRetry,
  warnings = [],
  circadianMultiplier = 1,
  timestamp,
}) => {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const styles = useMemo(() => StyleSheet.create({
    // Main card - uses design tokens for consistent theming
    card: {
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginVertical: spacing.sm,
      marginBottom: 80, // Extra space for floating AI chat button
      borderWidth: 1,
      overflow: 'hidden',
      width: '100%',
      maxWidth: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xl,
      minHeight: 56,
    },
    scoreBadge: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minWidth: 72,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gaugeContainer: {
      marginBottom: spacing.xl,
      width: '100%',
    },
    gaugeTrack: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
      marginBottom: spacing.xs,
      width: '100%',
    },
    gaugeSegment: {
      flex: 1,
      marginHorizontal: 1,
    },
    gaugeSegmentFilled: {},
    gaugeSegmentEmpty: {
      backgroundColor: colors.surfaceAlt,
    },
    gaugeLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: spacing.xs,
    },
    breakdownContainer: {
      marginBottom: spacing.lg,
      width: '100%',
    },
    breakdownItem: {
      marginBottom: spacing.md,
      width: '100%',
    },
    breakdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
      width: '100%',
    },
    // Clean progress bar track - parent with overflow hidden and borderRadius
    breakdownBarTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
      width: '100%',
    },
    // Inner fill - simple dynamic width, height 100%
    breakdownBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    messageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radii.md,
      marginTop: spacing.xs,
      width: '100%',
    },
    warningBanner: {
      flexDirection: 'column',
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      marginBottom: spacing.md,
      gap: spacing.xs,
      width: '100%',
    },
    warningRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    errorContainer: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      width: '100%',
    },
    retryButton: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: radii.md,
      marginTop: spacing.xs,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      width: '100%',
    },
    // Skeleton styles - using surface colors for skeleton placeholders
    skeletonLabelContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    skeletonLabel: {
      height: 16,
      width: '60%',
      borderRadius: radii.xs,
      backgroundColor: colors.surfaceAlt,
      marginBottom: spacing.xs,
    },
    skeletonValue: {
      height: 24,
      width: '40%',
      borderRadius: radii.xs,
      backgroundColor: colors.surfaceAlt,
    },
    skeletonScore: {
      width: 80,
      height: 56,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceAlt,
    },
    skeletonGaugeTrack: {
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surfaceAlt,
      marginBottom: spacing.xs,
      width: '100%',
    },
    skeletonGauge: {
      width: '100%',
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.surfaceAlt,
    },
    skeletonGaugeLabels: {
      height: 12,
      width: '100%',
    },
    skeletonBreakdownContainer: {
      marginBottom: spacing.lg,
      width: '100%',
    },
    skeletonBreakdownItem: {
      width: '100%',
      height: 44,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceAlt,
      marginBottom: spacing.md,
    },
    skeletonMessage: {
      height: 40,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceAlt,
      width: '100%',
    },
  }), [colors, spacing, radii]);

  // Determine colors based on category
  const getCategoryColors = () => {
    switch (category) {
      case 'low':
        return { primary: colors.success, bg: colors.success + '15', border: colors.success + '30' };
      case 'medium':
        return { primary: colors.warning, bg: colors.warning + '15', border: colors.warning + '30' };
      case 'high':
        return { primary: colors.danger, bg: colors.danger + '15', border: colors.danger + '30' };
      default:
        return { primary: colors.textMuted, bg: colors.surfaceAlt, border: colors.border };
    }
  };

  const { primary, bg, border } = getCategoryColors();

  // Capitalize message for proper typography
  const displayMessage = message ? capitalizeFirst(message) : '';

  // Render segmented progress bar (gauge) - clean 10-segment bar
  const renderGauge = () => {
    if (score === null) return null;
    
    const segments = 10;
    const filledSegments = Math.round((score / 100) * segments);
    
    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeTrack}>
          {Array.from({ length: segments }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.gaugeSegment,
                i < filledSegments ? styles.gaugeSegmentFilled : styles.gaugeSegmentEmpty,
                i < filledSegments && { backgroundColor: primary },
              ]}
            />
          ))}
        </View>
        <View style={styles.gaugeLabels}>
          <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>Low</Text>
          <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>High</Text>
        </View>
      </View>
    );
  };

  // Render breakdown bars - clean progress bars with no artifacts
  const renderBreakdown = () => {
    if (!breakdown) {
      return null;
    }

    const items = [
      { key: 'mood', label: 'Mood', data: breakdown.mood, color: colors.primary },
      { key: 'habits', label: 'Habits', data: breakdown.habits, color: colors.secondary },
      { key: 'environment', label: 'Environment', data: breakdown.environment, color: colors.accent },
    ].filter((item) => item.data !== null);

    return (
      <View style={styles.breakdownContainer}>
        {items.map((item) => (
          <View key={item.key} style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[typography.caption, { color: item.color, fontWeight: '600' }]}>
                  {item.label}
                </Text>
                {item.key === 'mood' && item.data.trend && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor:
                        item.data.trend === 'improving'
                          ? colors.success + '15'
                          : colors.danger + '15',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 10,
                      gap: 2,
                    }}
                  >
                    <Ionicons
                      name={item.data.trend === 'improving' ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={item.data.trend === 'improving' ? colors.success : colors.danger}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '600',
                        color:
                          item.data.trend === 'improving' ? colors.success : colors.danger,
                      }}
                    >
                      {item.data.trend === 'improving' ? 'Improving' : 'Worsening'}
                    </Text>
                  </View>
                )}
                {item.key === 'habits' &&
                  item.data.streak !== undefined &&
                  item.data.streak > 0 && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.warning + '15',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 10,
                        gap: 2,
                      }}
                    >
                      <Text style={{ fontSize: 10 }}>🔥</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.warning }}>
                        {item.data.streak}-day streak
                      </Text>
                    </View>
                  )}
              </View>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '500' }]}>
                {Math.round(item.data.weight * 100)}%
              </Text>
            </View>
            {/* Clean progress bar - parent with overflow hidden, inner fill with dynamic width */}
            <View style={styles.breakdownBarTrack}>
              <View
                style={[
                  styles.breakdownBarFill,
                  { width: `${item.data.score}%`, backgroundColor: item.color },
                ]}
              />
            </View>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
              ]}
            >
              {item.data.score}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // Render loading skeleton
  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.skeletonLabelContainer}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonValue} />
          </View>
          <View style={styles.skeletonScore} />
        </View>
        <View style={styles.gaugeContainer}>
          <View style={styles.skeletonGaugeTrack}>
            <View style={styles.skeletonGauge} />
          </View>
          <View style={styles.skeletonGaugeLabels} />
        </View>
        <View style={styles.skeletonBreakdownContainer}>
          <View style={styles.skeletonBreakdownItem} />
          <View style={styles.skeletonBreakdownItem} />
          <View style={styles.skeletonBreakdownItem} />
        </View>
        <View style={[styles.messageContainer, { backgroundColor: colors.surfaceAlt }]}>
          <View style={styles.skeletonMessage} />
        </View>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.card, { borderColor: colors.danger + '50', backgroundColor: colors.danger + '05' }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} style={{ marginBottom: spacing.md }} />
          <Text style={[typography.h3, { color: colors.danger, textAlign: 'center', marginBottom: spacing.xs }]}>
            Unable to Load Score
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg }]}>
            {error}
          </Text>
          {onRetry && (
            <TouchableOpacity
              onPress={onRetry}
              style={[styles.retryButton, { backgroundColor: colors.danger }]}
            >
              <Text style={[typography.button, { color: colors.textInverse }]}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Render empty state
  if (score === null) {
    return (
      <View style={[styles.card, { borderColor: colors.primary + '30' }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="pulse-outline" size={40} color={colors.primary} style={{ marginBottom: spacing.md }} />
          <Text style={[typography.h3, { color: colors.primary, textAlign: 'center', marginBottom: spacing.xs }]}>
            Cortisol Risk Score
          </Text>
          <Text style={[typography.bodySmall, { color: colors.textMuted, textAlign: 'center' }]}>
            Log your first mood or complete a habit to see your personalized cortisol risk estimate.
          </Text>
        </View>
      </View>
    );
  }

  // Render normal state
  return (
    <View style={[styles.card, { borderColor: border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[typography.caption, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 }]}>
            Estimated Cortisol Risk
          </Text>
          <Text style={[typography.h3, { color: colors.text, marginTop: 2 }]}>
            {label}
          </Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: bg }]}>
          <Text style={[typography.h1, { color: primary, fontWeight: '700' }]}>{score}</Text>
          <Text style={[typography.caption, { color: primary, fontWeight: '600', textTransform: 'uppercase', fontSize: 10 }]}>Score</Text>
        </View>
      </View>

      {renderGauge()}

      {renderBreakdown()}

      {warnings && warnings.length > 0 && (
        <View
          style={[
            styles.warningBanner,
            { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' },
          ]}
        >
          {warnings.map((w, idx) => (
            <View key={idx} style={styles.warningRow}>
              <Ionicons name="time-outline" size={14} color={colors.warning} />
              <Text
                style={[
                  typography.caption,
                  { color: colors.warning, flex: 1, marginLeft: 6, flexShrink: 1, lineHeight: 16 },
                ]}
              >
                {w}
              </Text>
            </View>
          ))}
          {timestamp && (
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, fontSize: 10, marginTop: 6, textAlign: 'right' },
              ]}
            >
              Updated: {new Date(timestamp).toLocaleString()}
            </Text>
          )}
        </View>
      )}

      <View style={[styles.messageContainer, { backgroundColor: bg }]}>
        <Ionicons 
          name={category === 'low' ? 'checkmark-circle' : category === 'medium' ? 'warning-outline' : 'alert-circle-outline'} 
          size={18} 
          color={primary} 
          style={{ marginRight: spacing.xs }} 
        />
        <Text style={[typography.bodySmall, { color: primary, flex: 1, flexShrink: 1, lineHeight: 20 }]}>{displayMessage}</Text>
      </View>
    </View>
  );
};

export default CortisolGaugeCard;