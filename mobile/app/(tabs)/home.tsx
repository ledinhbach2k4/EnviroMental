import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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

  const fetchMood = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/moods`, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Mood API response status:', res.status);

      if (res.ok) {
        const entries = await res.json();
        console.log('Mood API response data:', entries);
        if (entries && entries.length > 0) {
          const latestMood = entries[entries.length - 1];
          const newMood = { value: moodEmojis[latestMood.moodLevel], color: moodColors[latestMood.moodLevel] };
          console.log('Setting new mood:', newMood);
          setMood(newMood);
        } else {
          console.log('No mood entries found, setting mood to null');
          setMood(null);
        }
      }
    } catch (error) {
      console.error(`Error fetching today's mood:`, error);
    }
  }, [getToken]);

  const fetchWeather = useCallback(async () => {
    setLoadingWeather(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
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
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setWeather({ temperature: Math.round(data.main.temp), description: data.weather[0].description, city: data.name });
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Weather fetch error:', err.message);
      setErrorMsg('Failed to fetch weather data');
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Fetch all data when the screen comes into focus
      fetchMood();
      fetchWeather();
      refetchHabits();
    }, [fetchMood, fetchWeather, refetchHabits])
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