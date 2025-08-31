import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleProp, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, commonStyles, gradients, textStyles } from '../../assets/styles/commonStyles';
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

const meditationSessions: MeditationSession[] = [
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
];

const CardContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const AndroidCardContent = ({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) => (
  <View style={style}>{children}</View>
);

export default function Mindfulness() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSession, setCurrentSession] = useState<MeditationSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

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
    const duration = parseInt(session.duration) * 60; // Convert minutes to seconds
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
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>Mindfulness 🧘‍♀️</Text>
          <Text style={textStyles.bodyLight}>Find peace and clarity through meditation</Text>
        </View>

        {currentSession && (
          <LinearGradient
            colors={[currentSession.color + '20', currentSession.color + '10']}
            style={[commonStyles.card, { marginBottom: 30 }]}>
            <CardWrapper>
              <View style={{ alignItems: 'center' }}>
                <Icon name={currentSession.icon} size={48} color={currentSession.color} style={{ marginBottom: 16 }} />
                <Text style={[textStyles.h3, { marginBottom: 8, textAlign: 'center' }]}>{currentSession.title}</Text>
                <Text style={[textStyles.caption, { marginBottom: 20, textAlign: 'center' }]}>
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
                    marginBottom: 20,
                    borderWidth: 4,
                    borderColor: currentSession.color,
                  }}>
                  <Text style={[textStyles.h2, { color: currentSession.color }]}>{formatTime(timeRemaining)}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 16 }}>
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
                    <Icon name={isPlaying ? 'pause' : 'play'} size={24} color={colors.backgroundAlt} />
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
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <CardWrapper>
              <Text style={[textStyles.h3, { marginBottom: 16 }]}>Quick Start</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={[
                    commonStyles.cardSmall,
                    { width: '48%', alignItems: 'center', borderColor: colors.success + '30' },
                  ]}
                  onPress={() => startSession(meditationSessions[1])}>
                  <CardWrapper>
                    <Icon name="leaf" size={32} color={colors.success} style={{ marginBottom: 8 }} />
                    <Text style={[textStyles.body, { textAlign: 'center' }]}>Quick Breathing</Text>
                    <Text style={[textStyles.caption, { textAlign: 'center' }]}>5 min</Text>
                  </CardWrapper>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    commonStyles.cardSmall,
                    { width: '48%', alignItems: 'center', borderColor: colors.primary + '30' },
                  ]}
                  onPress={() => startSession(meditationSessions[0])}>
                  <CardWrapper>
                    <Icon name="sunny" size={32} color={colors.warning} style={{ marginBottom: 8 }} />
                    <Text style={[textStyles.body, { textAlign: 'center' }]}>Morning Focus</Text>
                    <Text style={[textStyles.caption, { textAlign: 'center' }]}>10 min</Text>
                  </CardWrapper>
                </TouchableOpacity>
              </View>
            </CardWrapper>
          </View>
        )}

        {!currentSession && (
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <CardWrapper>
              <Text style={[textStyles.h3, { marginBottom: 16 }]}>All Sessions</Text>
              {meditationSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[commonStyles.cardSmall, { marginBottom: 12 }]}
                  onPress={() => startSession(session)}>
                  <CardWrapper>
                    <View style={commonStyles.spaceBetween}>
                      <View style={[commonStyles.row, { flexShrink: 1, marginRight: 8 }]}>
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: session.color + '20',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                          }}>
                          <Icon name={session.icon} size={24} color={session.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={textStyles.body}>{session.title}</Text>
                          <Text style={textStyles.caption}>{session.description}</Text>
                          <View style={[commonStyles.row, { marginTop: 4 }]}>
                            <Text style={[textStyles.caption, { color: session.color }]}>
                              {session.type} • {session.duration}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Icon name="play" size={20} color={colors.textLight} />
                    </View>
                  </CardWrapper>
                </TouchableOpacity>
              ))}
            </CardWrapper>
          </View>
        )}

        <LinearGradient colors={gradients.wellness} style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper>
            <Icon name="heart" size={24} color={colors.backgroundAlt} style={{ marginBottom: 8 }} />
            <Text style={[textStyles.h3, { color: colors.backgroundAlt, marginBottom: 8 }]}>
              Benefits of Meditation
            </Text>
            <Text style={[textStyles.body, { color: colors.backgroundAlt }]}>
              {`• Reduces stress and anxiety
• Improves focus and concentration
• Enhances emotional well-being
• Better sleep quality
• Increased self-awareness`}
            </Text>
          </CardWrapper>
        </LinearGradient>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <CardWrapper>
            <Icon name="bulb" size={24} color={colors.warning} style={{ marginBottom: 8 }} />
            <Text style={[textStyles.h3, { marginBottom: 8 }]}>Meditation Tip</Text>
            <Text style={textStyles.body}>
              Find a quiet, comfortable space where you won&apos;t be disturbed. It&apos;s normal for your mind to
              wander - gently bring your attention back to your breath or the guided meditation.
            </Text>
          </CardWrapper>
        </View>
      </ScrollView>
    </View>
  );
}
