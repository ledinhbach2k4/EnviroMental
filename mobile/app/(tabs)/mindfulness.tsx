import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useMemo } from 'react';
import { Alert, Platform, ScrollView, StyleProp, Text, TouchableOpacity, View, ViewStyle, StyleSheet } from 'react-native';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
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

export default function Mindfulness() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSession, setCurrentSession] = useState<MeditationSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

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
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardSmall: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      marginVertical: spacing.xs,
      ...shadows.xs,
      borderWidth: 1,
      borderColor: colors.border,
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

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsPlaying(false);
            setCurrentSession(null);
            Alert.alert('Session Complete!', 'Great job on completing your meditation session! 🧘‍♀️');
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

  const startSession = (session: MeditationSession) => {
    const duration = parseInt(session.duration) * 60;
    setCurrentSession(session);
    setTimeRemaining(duration);
    setIsPlaying(true);
    console.log(`Starting meditation session: ${session.title}`);
  };

  const pauseSession = () => {
    setIsPlaying(!isPlaying);
  };

  const stopSession = () => {
    setIsPlaying(false);
    setCurrentSession(null);
    setTimeRemaining(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const CardWrapper = Platform.OS === 'android' ? AndroidCardContent : CardContent;

  return (
    <View style={cardStyles.container}>
      <ScrollView style={cardStyles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
          <Text style={[typography.h1, { color: colors.primary }]}>Mindfulness 🧘‍♀️</Text>
          <Text style={typography.bodySmall}>Find peace and clarity through meditation</Text>
        </View>

        {currentSession && (
          <LinearGradient
            colors={[currentSession.color + '20', currentSession.color + '10']}
            style={[cardStyles.card, { marginBottom: spacing.xxl }]}>
            <CardWrapper>
              <View style={{ alignItems: 'center' }}>
                <Icon name={currentSession.icon} size={48} color={currentSession.color} style={{ marginBottom: spacing.lg }} />
                <Text style={[typography.h3, { marginBottom: spacing.sm, textAlign: 'center' }]}>{currentSession.title}</Text>
                <Text style={[typography.caption, { marginBottom: spacing.xl, textAlign: 'center' }]}>
                  {currentSession.description}
                </Text>

                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: currentSession.color + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.lg,
                    borderWidth: 4,
                    borderColor: currentSession.color,
                  }}>
                  <Text style={[typography.h2, { color: currentSession.color }]}>{formatTime(timeRemaining)}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                  <TouchableOpacity
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: currentSession.color,
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
                  style={[
                    cardStyles.cardSmall,
                    { width: '48%', alignItems: 'center', borderColor: colors.success + '30' },
                  ]}
                  onPress={() => startSession(meditationSessions[1])}>
                  <CardWrapper>
                    <Icon name="leaf" size={32} color={colors.success} style={{ marginBottom: spacing.sm }} />
                    <Text style={[typography.body, { textAlign: 'center' }]}>Quick Breathing</Text>
                    <Text style={[typography.caption, { textAlign: 'center' }]}>5 min</Text>
                  </CardWrapper>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    cardStyles.cardSmall,
                    { width: '48%', alignItems: 'center', borderColor: colors.primary + '30' },
                  ]}
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
    </View>
  );
}