import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, ScrollView, StyleProp, Text, TouchableOpacity, View, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icon';

interface MeditationSession {
  id: string;
  title: string;
  duration: string;
  type: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const CardContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const AndroidCardContent = ({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) => (
  <View style={style}>{children}</View>
);

// Breathing cycle timings (ms)
const INHALE_MS = 4000;
const EXHALE_MS = 6000;
const INHALE_SCALE = 1.25;

// Mock API call that saves mindfulness progress
const saveMindfulnessProgress = (minutes: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 800));

export default function Mindfulness() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  const insets = useSafeAreaInsets();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSession, setCurrentSession] = useState<MeditationSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [earnedMinutes, setEarnedMinutes] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [totalMindfulnessMinutes, setTotalMindfulnessMinutes] = useState(0);

  const sessionCompletedRef = useRef(false);
  const scale = useSharedValue(1);
  const meditationSessions = useMemo((): MeditationSession[] => [
    {
      id: '1',
      title: 'Morning Mindfulness',
      duration: '10 min',
      type: 'Mindfulness',
      description: 'Start your day with awareness and intention',
      icon: 'sunny',
      color: colors.warning,
    },
    {
      id: '2',
      title: 'Breathing Exercise',
      duration: '5 min',
      type: 'Breathing',
      description: 'Simple breathing techniques to reduce stress',
      icon: 'leaf',
      color: colors.success,
    },
    {
      id: '3',
      title: 'Body Scan',
      duration: '15 min',
      type: 'Relaxation',
      description: 'Release tension and connect with your body',
      icon: 'body',
      color: colors.primary,
    },
    {
      id: '4',
      title: 'Sleep Meditation',
      duration: '20 min',
      type: 'Sleep',
      description: 'Peaceful meditation to help you fall asleep',
      icon: 'moon',
      color: colors.secondary,
    },
    {
      id: '5',
      title: 'Loving Kindness',
      duration: '12 min',
      type: 'Compassion',
      description: 'Cultivate love and compassion for yourself and others',
      icon: 'heart',
      color: colors.accent,
    },
  ], [colors]);

  const cardStyles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginVertical: spacing.sm,
      ...shadows.sm,
    },
    cardSmall: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
      marginVertical: spacing.xs,
      ...shadows.xs,
    },
    container: {
      backgroundColor: colors.background,
      width: '100%',
      height: '100%',
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
  }), [colors, spacing, radii, shadows]);

  // Animated circle style — scales up for inhale, down for exhale, looping
  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Session countdown timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, timeRemaining]);

  // Handle session completion once
  useEffect(() => {
    if (isPlaying === false && timeRemaining === 0 && currentSession && !sessionCompletedRef.current && !claimed) {
      sessionCompletedRef.current = true;
      const minutes = parseInt(currentSession.duration) || 0;
      setEarnedMinutes(minutes);
      stopBreathingAnimation();
      setShowCompleteModal(true);
    }
  }, [isPlaying, timeRemaining, currentSession, claimed]);

  // Drive the breathing phase text from the actual Reanimated animation.
  // The inhale/exhale phase is derived directly from the scale animation by
  // invoking runOnJS(setBreathPhase) in each withTiming completion callback,
  // so the displayed text is always in lock-step with the circle's scale.
  useEffect(() => {
    return () => {
      cancelAnimation(scale);
    };
  }, [scale]);

  const startBreathingAnimation = () => {
    cancelAnimation(scale);
    scale.value = 1;
    setBreathPhase('inhale');
    scale.value = withRepeat(
      withSequence(
        withTiming(
          INHALE_SCALE,
          { duration: INHALE_MS, easing: Easing.inOut(Easing.quad) },
          (finished) => { if (finished) runOnJS(setBreathPhase)('exhale'); }
        ),
        withTiming(
          1,
          { duration: EXHALE_MS, easing: Easing.inOut(Easing.quad) },
          (finished) => { if (finished) runOnJS(setBreathPhase)('inhale'); }
        )
      ),
      -1
    );
  };

  const stopBreathingAnimation = () => {
    cancelAnimation(scale);
    scale.value = 1;
  };

  const startSession = (session: MeditationSession) => {
    const duration = parseInt(session.duration) * 60;
    setCurrentSession(session);
    setTimeRemaining(duration);
    sessionCompletedRef.current = false;
    setClaimed(false);
    setShowCompleteModal(false);
    setIsPlaying(true);
    setBreathPhase('inhale');
    startBreathingAnimation();
    console.log(`Starting meditation session: ${session.title}`);
  };

  const pauseSession = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next) {
        startBreathingAnimation();
      } else {
        stopBreathingAnimation();
      }
      return next;
    });
  };

  const stopSession = () => {
    setIsPlaying(false);
    stopBreathingAnimation();
    setCurrentSession(null);
    setTimeRemaining(0);
    sessionCompletedRef.current = false;
    setShowCompleteModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClaim = async () => {
    if (isClaiming || claimed) return;
    setIsClaiming(true);
    await saveMindfulnessProgress(earnedMinutes);
    setTotalMindfulnessMinutes((prev) => prev + earnedMinutes);
    setClaimed(true);
    setIsClaiming(false);
  };

  const handleFinishClaimed = () => {
    setShowCompleteModal(false);
    setCurrentSession(null);
    setTimeRemaining(0);
    setBreathPhase('inhale');
    stopBreathingAnimation();
  };

  const sessionColor = currentSession?.color || colors.primary;
  const CardWrapper = Platform.OS === 'android' ? AndroidCardContent : CardContent;

  return (
    <View style={[cardStyles.container, { paddingTop: insets.top }]}>
      <ScrollView style={cardStyles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xxl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={[typography.h1, { color: colors.primary }]}>Mindfulness 🧘‍♀️</Text>
            <Text style={typography.bodySmall}>Find peace and clarity through meditation</Text>
          </View>
          {totalMindfulnessMinutes > 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[typography.h2, { color: colors.secondary }]}>{totalMindfulnessMinutes}</Text>
              <Text style={typography.caption}>minutes earned</Text>
            </View>
          )}
        </View>

        {currentSession && (
          <LinearGradient
            colors={[sessionColor + '20', sessionColor + '08']}
            style={[cardStyles.card, { marginBottom: spacing.xxl }]}>
            <CardWrapper>
              <View style={{ alignItems: 'center' }}>
                <Icon name={currentSession.icon} size={48} color={sessionColor} style={{ marginBottom: spacing.lg }} />
                <Text style={[typography.h3, { marginBottom: spacing.sm, textAlign: 'center' }]}>{currentSession.title}</Text>
                <Text style={[typography.caption, { marginBottom: spacing.xl, textAlign: 'center' }]}>
                  {currentSession.description}
                </Text>

                <Text style={[typography.h2, { color: sessionColor, marginBottom: spacing.md }]}>
                  {formatTime(timeRemaining)}
                </Text>

                {/* Animated breathing circle */}
                <View
                  style={{
                    width: 240,
                    height: 240,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.lg,
                  }}>
                  <View
                    style={{
                      position: 'absolute',
                      width: 240,
                      height: 240,
                      borderRadius: 120,
                      backgroundColor: sessionColor + '10',
                    }}
                  />
                  <Animated.View
                    style={[
                      {
                        width: 200,
                        height: 200,
                        borderRadius: 100,
                        backgroundColor: sessionColor + '20',
                        borderWidth: 2,
                        borderColor: sessionColor + '50',
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                      animatedCircleStyle,
                    ]}>
                    <Text style={[typography.h2, { color: sessionColor }]}>
                      {breathPhase === 'inhale' ? 'Breathe In...' : 'Breathe Out...'}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
                      {breathPhase === 'inhale' ? '4 seconds' : '6 seconds'}
                    </Text>
                  </Animated.View>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                  <TouchableOpacity
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: sessionColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={pauseSession}>
                    <Icon name={isPlaying ? 'pause' : 'play'} size={24} color={colors.textInverse} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onPress={stopSession}>
                    <Icon name="stop" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </CardWrapper>
          </LinearGradient>
        )}

        {!currentSession && (
          <View style={[cardStyles.card, { marginBottom: spacing.xxl }]}>
            <CardWrapper>
              <Text style={[typography.h3, { marginBottom: spacing.lg }]}>Quick Start</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={[cardStyles.cardSmall, { width: '48%', alignItems: 'center' }]}
                  onPress={() => startSession(meditationSessions[1])}>
                  <CardWrapper>
                    <Icon name="leaf" size={32} color={colors.success} style={{ marginBottom: spacing.sm }} />
                    <Text style={[typography.body, { textAlign: 'center' }]}>Quick Breathing</Text>
                    <Text style={[typography.caption, { textAlign: 'center' }]}>5 min</Text>
                  </CardWrapper>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[cardStyles.cardSmall, { width: '48%', alignItems: 'center' }]}
                  onPress={() => startSession(meditationSessions[0])}>
                  <CardWrapper>
                    <Icon name="sunny" size={32} color={colors.warning} style={{ marginBottom: spacing.sm }} />
                    <Text style={[typography.body, { textAlign: 'center' }]}>Morning Focus</Text>
                    <Text style={[typography.caption, { textAlign: 'center' }]}>10 min</Text>
                  </CardWrapper>
                </TouchableOpacity>
              </View>
            </CardWrapper>
          </View>
        )}

        {!currentSession && (
          <View style={[cardStyles.card, { marginBottom: spacing.xxl }]}>
            <CardWrapper>
              <Text style={[typography.h3, { marginBottom: spacing.lg }]}>All Sessions</Text>
              {meditationSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[cardStyles.cardSmall, { marginBottom: spacing.md }]}
                  onPress={() => startSession(session)}>
                  <CardWrapper>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: spacing.md }}>
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: session.color + '20',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: spacing.md,
                          }}>
                          <Icon name={session.icon} size={24} color={session.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={typography.body}>{session.title}</Text>
                          <Text style={typography.caption}>{session.description}</Text>
                          <View style={{ flexDirection: 'row', marginTop: spacing.xs }}>
                            <Text style={[typography.caption, { color: session.color }]}>
                              {session.type} • {session.duration}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Icon name="play" size={20} color={colors.textMuted} />
                    </View>
                  </CardWrapper>
                </TouchableOpacity>
              ))}
            </CardWrapper>
          </View>
        )}

        <LinearGradient colors={colors.gradients.wellness} style={[cardStyles.card, { marginBottom: spacing.xxl }]}>
          <CardWrapper>
            <Icon name="heart" size={24} color={colors.textInverse} style={{ marginBottom: spacing.sm }} />
            <Text style={[typography.h3, { color: colors.textInverse, marginBottom: spacing.sm }]}>
              Benefits of Meditation
            </Text>
            <Text style={[typography.body, { color: colors.textInverse }]}>
              {`• Reduces stress and anxiety
• Improves focus and concentration
• Enhances emotional well-being
• Better sleep quality
• Increased self-awareness`}
            </Text>
          </CardWrapper>
        </LinearGradient>

        <View style={[cardStyles.card, { marginBottom: spacing.xxl }]}>
          <CardWrapper>
            <Icon name="bulb" size={24} color={colors.warning} style={{ marginBottom: spacing.sm }} />
            <Text style={[typography.h3, { marginBottom: spacing.sm }]}>Meditation Tip</Text>
            <Text style={typography.body}>
              Find a quiet, comfortable space where you won&apos;t be disturbed. It&apos;s normal for your mind to
              wander - gently bring your attention back to your breath or the guided meditation.
            </Text>
          </CardWrapper>
        </View>
      </ScrollView>

      {/* Success / Gamification Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => { if (claimed) handleFinishClaimed(); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <View style={[cardStyles.card, { width: '100%', alignItems: 'center', padding: spacing.xxl }]}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: (claimed ? colors.success : colors.primary) + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}>
              <Icon
                name={claimed ? 'checkmark' : 'trophy'}
                size={40}
                color={claimed ? colors.success : colors.primary}
              />
            </View>

            <Text style={[typography.h2, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
              {claimed ? 'Added to your progress!' : 'Session Complete!'}
            </Text>

            {!claimed && (
              <>
                <Text style={[typography.h3, { color: colors.primary, marginBottom: spacing.xs }]}>
                  + {earnedMinutes} Mindfulness Minutes
                </Text>
                <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl }]}>
                  Great job on completing your meditation session! 🧘‍♀️
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.xxl,
                    borderRadius: radii.full,
                    ...shadows.sm,
                  }}
                  onPress={handleClaim}
                  disabled={isClaiming}>
                  <Text style={[typography.button, { color: colors.textInverse }]}>
                    {isClaiming ? 'Adding...' : 'Claim Points'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {claimed && (
              <>
                <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl }]}>
                  Total: {totalMindfulnessMinutes} mindfulness minutes
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.secondary,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.xxl,
                    borderRadius: radii.full,
                    ...shadows.sm,
                  }}
                  onPress={handleFinishClaimed}>
                  <Text style={[typography.button, { color: colors.textInverse }]}>Return to Sessions</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
