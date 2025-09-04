import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, commonStyles, textStyles } from '../../assets/styles/commonStyles';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { API_URL } from '../../constants/api';
import { useHabits } from '../../hooks/useHabits';

interface QuickStat {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface WeatherData {
  temperature: number;
  description: string;
  city: string;
}

interface MoodData {
  value: string;
  color: string;
}

const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
const moodColors = [colors.moodVerySad, colors.moodSad, colors.moodNeutral, colors.moodHappy, colors.moodVeryHappy];

const CardContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const AndroidCardContent = ({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) => (
  <View style={style}>{children}</View>
);

const CardWrapper = Platform.OS === 'android' ? AndroidCardContent : CardContent;

export default function Home() {
  console.log("Home component rendered"); // Added log

  const [greeting, setGreeting] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mood, setMood] = useState<MoodData | null>(null);

  const { getToken } = useAuth();
  const { habits, loading: habitsLoading, refetch: refetchHabits } = useHabits();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  const isFetched = useRef(false); // Ngăn fetch lặp trong cùng focus

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchAll = async () => {
        if (!isActive || isFetched.current) return;
        isFetched.current = true;
        try {
          await Promise.all([fetchMood(), fetchWeather(), refetchHabits()]);
        } finally {
          isFetched.current = false; // Reset for next focus
        }
      };

      const fetchMood = async () => {
        if (getToken && isActive) {
          try {
            const token = await getToken();
            const res = await fetch(`${API_URL}/moods`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok && isActive) {
              const entries = await res.json();
              if (entries.length > 0) {
                const latestMood = entries[entries.length - 1];
                setMood({ value: moodEmojis[latestMood.moodLevel], color: moodColors[latestMood.moodLevel] });
              }
            }
          } catch (error) {
            console.error(`Error fetching today's mood:`, error);
          }
        }
      };

      const fetchWeather = async () => {
        if (isActive) {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            console.log('Location permission status:', status);
            if (status !== 'granted') {
              setErrorMsg('Permission to access location was denied');
              return;
            }

            const loc = await Location.getCurrentPositionAsync({});
            const apiKey = Constants.expoConfig?.extra?.openWeatherApiKey;
            if (!apiKey) {
              setErrorMsg('Weather API key not configured');
              return;
            }

            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&units=metric&appid=${apiKey}`
            );
            if (!res.ok && isActive) throw new Error(`API error: ${res.status}`);
            const data = await res.json();
            const newWeather = { temperature: Math.round(data.main.temp), description: data.weather[0].description, city: data.name };
            if (JSON.stringify(newWeather) !== JSON.stringify(weather) && isActive) setWeather(newWeather);
          } catch (err: any) {
            console.error('Weather fetch error:', err.message);
            if (isActive) setErrorMsg('Failed to fetch weather data');
          } finally {
            if (isActive) setLoadingWeather(false);
          }
        }
      };

      fetchAll();

      return () => {
        isActive = false;
      };
    }, [getToken, refetchHabits, weather, setMood, setErrorMsg, setLoadingWeather])
  );

  const handleEmergency = () => {
    router.push('/emergency' as any);
  };

  const completedHabits = habits.filter(h => h.completedToday).length;
  const totalHabits = habits.length;

  const quickStats: QuickStat[] = [
    {
      title: 'Mood',
      value: mood ? mood.value : 'No mood logged',
      icon: 'happy-outline',
      color: mood ? mood.color : colors.textLight,
    },
    {
      title: 'Habits Done',
      value: habitsLoading ? '...' : `${completedHabits}/${totalHabits}`,
      icon: 'checkbox-outline',
      color: colors.success,
    },
    {
      title: 'Current Weather',
      value: loadingWeather ? 'Loading...' : errorMsg || (weather ? `${weather.temperature}°C, ${weather.description}` : 'No location'),
      icon: 'cloud-outline',
      color: colors.primary,
    },
  ];

  return (
    <View style={[commonStyles.container, { paddingTop: Platform.OS === 'ios' ? 40 : 20 }]}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={{ marginVertical: 20 }}>
          <Text style={textStyles.h1}>{greeting}!</Text>
          <Text style={textStyles.bodyLight}>Take a moment for your mental health</Text>
        </View>

        <View style={[commonStyles.card, { marginBottom: 24 }]}>
          <CardWrapper>
            <Text style={textStyles.h3}>Quick Stats</Text>
            {quickStats.map((stat, index) => (
              <View
                key={index}
                style={[
                  commonStyles.row,
                  { marginTop: 16, paddingBottom: 16 },
                  index < quickStats.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Icon name={stat.icon} size={24} color={stat.color} style={{ marginRight: 12 }} />
                <View>
                  <Text style={textStyles.caption}>{stat.title}</Text>
                  <Text style={textStyles.body}>{stat.value}</Text>
                </View>
              </View>
            ))}
          </CardWrapper>
        </View>

        <View style={{ marginBottom: 24 }}>
          <TouchableOpacity style={[commonStyles.card, { marginBottom: 12 }]} onPress={() => router.push('/mood' as any)}>
            <CardWrapper>
              <View style={commonStyles.spaceBetween}>
                <View style={commonStyles.row}>
                  <Icon name="heart" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                  <View>
                    <Text style={textStyles.body}>Log Mood</Text>
                    <Text style={textStyles.caption}>Track your emotional state</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </CardWrapper>
          </TouchableOpacity>

          <TouchableOpacity style={[commonStyles.card, { marginBottom: 12 }]} onPress={() => router.push('/forum' as any)}>
            <CardWrapper>
              <View style={commonStyles.spaceBetween}>
                <View style={commonStyles.row}>
                  <Icon name="chatbubbles" size={24} color={colors.warning} style={{ marginRight: 12 }} />
                  <View>
                    <Text style={textStyles.body}>Community Forum</Text>
                    <Text style={textStyles.caption}>Connect with others</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </CardWrapper>
          </TouchableOpacity>

          <TouchableOpacity style={[commonStyles.card, { marginBottom: 12 }]} onPress={() => router.push('/mindfulness' as any)}>
            <CardWrapper>
              <View style={commonStyles.spaceBetween}>
                <View style={commonStyles.row}>
                  <Icon name="leaf" size={24} color={colors.success} style={{ marginRight: 12 }} />
                  <View>
                    <Text style={textStyles.body}>Mindfulness</Text>
                    <Text style={textStyles.caption}>Find your inner peace</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </CardWrapper>
          </TouchableOpacity>

          <TouchableOpacity style={[commonStyles.card, { marginBottom: 12 }]} onPress={() => router.push('/(tabs)/habits' as any)}>
            <CardWrapper>
              <View style={commonStyles.spaceBetween}>
                <View style={commonStyles.row}>
                  <Icon name="checkmark-circle" size={24} color={colors.success} style={{ marginRight: 12 }} />
                  <View>
                    <Text style={textStyles.body}>Check Habits</Text>
                    <Text style={textStyles.caption}>Mark today&apos;s progress</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </CardWrapper>
          </TouchableOpacity>
        </View>

        <View style={[commonStyles.card, { borderColor: colors.danger + '30', marginBottom: 30 }]}>
          <CardWrapper>
            <View style={{ alignItems: 'center' }}>
              <Icon name="medical" size={32} color={colors.danger} style={{ marginBottom: 12 }} />
              <Text style={[textStyles.h3, { color: colors.danger, marginBottom: 8 }]}>
                Need Immediate Help?
              </Text>
              <Text style={[textStyles.caption, { textAlign: 'center', marginBottom: 16 }]}>
                If you&apos;re in crisis, don&apos;t hesitate to reach out for support
              </Text>
              <Button text="Emergency Support" onPress={handleEmergency} style={{ backgroundColor: colors.danger, width: '100%' }} />
            </View>
          </CardWrapper>
        </View>
      </ScrollView>
    </View>
  );
}