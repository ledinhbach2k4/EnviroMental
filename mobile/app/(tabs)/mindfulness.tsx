import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, textStyles, colors, gradients } from '../../assets/styles/commonStyles';
import Icon from '../../components/Icon';

interface MeditationSession {
  id: string;
  title: string;
  duration: string;
  type: string;
  description: string;
  icon: string;
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

export default function Mindfulness() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSession, setCurrentSession] = useState<MeditationSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    let interval: number;
    
    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
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

  return (
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>
            Mindfulness 🧘‍♀️
          </Text>
          <Text style={textStyles.bodyLight}>
            Find peace and clarity through meditation
          </Text>
        </View>

        {/* Current Session Player */}
        {currentSession && (
          <LinearGradient
            colors={[currentSession.color + '20', currentSession.color + '10']}
            style={[commonStyles.card, { marginBottom: 30 }]}
          >
            <View style={{ alignItems: 'center' }}>
              <Icon 
                name={currentSession.icon as any} 
                size={48} 
                style={{ color: currentSession.color, marginBottom: 16 }} 
              />
              <Text style={[textStyles.h3, { marginBottom: 8, textAlign: 'center' }]}>
                {currentSession.title}
              </Text>
              <Text style={[textStyles.caption, { marginBottom: 20, textAlign: 'center' }]}>
                {currentSession.description}
              </Text>
              
              {/* Timer */}
              <View style={{
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
                <Text style={[textStyles.h2, { color: currentSession.color }]}>
                  {formatTime(timeRemaining)}
                </Text>
              </View>

              {/* Controls */}
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
                  onPress={pauseSession}
                >
                  <Icon 
                    name={isPlaying ? "pause" : "play"} 
                    size={24} 
                    style={{ color: colors.backgroundAlt }} 
                  />
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
                  onPress={stopSession}
                >
                  <Icon name="stop" size={24} style={{ color: colors.text }} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Quick Actions */}
        {!currentSession && (
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Quick Start</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[commonStyles.cardSmall, { 
                  width: '48%', 
                  alignItems: 'center',
                  backgroundColor: colors.success + '15',
                  borderColor: colors.success + '30',
                }]}
                onPress={() => startSession(meditationSessions[1])} // Breathing exercise
              >
                <Icon name="leaf" size={32} style={{ color: colors.success, marginBottom: 8 }} />
                <Text style={[textStyles.body, { textAlign: 'center' }]}>
                  Quick Breathing
                </Text>
                <Text style={textStyles.caption}>5 min</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[commonStyles.cardSmall, { 
                  width: '48%', 
                  alignItems: 'center',
                  backgroundColor: colors.primary + '15',
                  borderColor: colors.primary + '30',
                }]}
                onPress={() => startSession(meditationSessions[0])} // Morning mindfulness
              >
                <Icon name="sunny" size={32} style={{ color: colors.warning, marginBottom: 8 }} />
                <Text style={[textStyles.body, { textAlign: 'center' }]}>
                  Morning Focus
                </Text>
                <Text style={textStyles.caption}>10 min</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* All Sessions */}
        {!currentSession && (
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>All Sessions</Text>
            
            {meditationSessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={[commonStyles.cardSmall, { marginBottom: 12 }]}
                onPress={() => startSession(session)}
              >
                <View style={commonStyles.spaceBetween}>
                  <View style={commonStyles.row}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: session.color + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      <Icon name={session.icon as any} size={24} style={{ color: session.color }} />
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
                  <Icon name="play" size={20} style={{ color: colors.textLight }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Benefits */}
        <LinearGradient
          colors={gradients.wellness}
          style={[commonStyles.card, { marginBottom: 30 }]}
        >
          <Icon name="heart" size={24} style={{ color: colors.backgroundAlt, marginBottom: 8 }} />
          <Text style={[textStyles.h3, { color: colors.backgroundAlt, marginBottom: 8 }]}>
            Benefits of Meditation
          </Text>
          <Text style={[textStyles.body, { color: colors.backgroundAlt }]}>
            • Reduces stress and anxiety{'\n'}
            • Improves focus and concentration{'\n'}
            • Enhances emotional well-being{'\n'}
            • Better sleep quality{'\n'}
            • Increased self-awareness
          </Text>
        </LinearGradient>

        {/* Tips */}
        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <Icon name="bulb" size={24} style={{ color: colors.warning, marginBottom: 8 }} />
          <Text style={[textStyles.h3, { marginBottom: 8 }]}>Meditation Tip</Text>
          <Text style={textStyles.body}>
            Find a quiet, comfortable space where you won&apos;t be disturbed. 
            It&apos;s normal for your mind to wander - gently bring your attention back 
            to your breath or the guided meditation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}