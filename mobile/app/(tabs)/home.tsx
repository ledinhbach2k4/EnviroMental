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
import { useSharedHabits } from '../../context/HabitsContext';
import type { Habit } from '../../hooks/useHabits';

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

interface AirQualityData {
  aqi: number;
}

const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
const moodColors = [colors.moodVerySad, colors.moodSad, colors.moodNeutral, colors.moodHappy, colors.moodVeryHappy];

const getAqiLabel = (aqi: number) => {
  switch (aqi) {
    case 1: return 'Good';
    case 2: return 'Fair';
    case 3: return 'Moderate';
    case 4: return 'Poor';
    case 5: return 'Very Poor';
    default: return 'Unknown';
  }
};

const getAqiColor = (aqi: number) => {
  switch (aqi) {
    case 1: return colors.success;
    case 2: return colors.primary;
    case 3: return colors.warning;
    case 4: return colors.danger;
    case 5: return colors.moodVerySad;
    default: return colors.textLight;
  }
};

const CardContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const AndroidCardContent = ({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) => (
  <View style={style}>{children}</View>
);

const CardWrapper = Platform.OS === 'android' ? AndroidCardContent : CardContent;

export default function Home() {
  console.log(`[${new Date().toISOString()}] Home component re-rendered.`);
  useEffect(() => {
    console.log(`[${new Date().toISOString()}] Home component MOUNTED.`);
    return () => {
      console.log(`[${new Date().toISOString()}] Home component UNMOUNTED.`);
    };
  }, []);

  const [greeting, setGreeting] = useState('');
  const [greetingIcon, setGreetingIcon] = useState<keyof typeof Ionicons.glyphMap>('sunny-outline');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mood, setMood] = useState<MoodData | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [loadingAirQuality, setLoadingAirQuality] = useState(true);
  const [errorAirPollution, setErrorAirPollution] = useState<string | null>(null);

  const { getToken } = useAuth();
  const { habits, loading: habitsLoading, refetch: refetchHabits } = useSharedHabits();

  // Refs for fetchMood cooldown
  const isFetchingMoodRef = useRef(false);
  const lastFetchMoodTimeRef = useRef(0);

  // Refs for fetchWeather cooldown
  const isFetchingWeatherRef = useRef(false);
  const lastFetchWeatherTimeRef = useRef(0);

  // Refs for fetchAirQuality cooldown
  const isFetchingAirQualityRef = useRef(false);
  const lastFetchAirQualityTimeRef = useRef(0);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('Good Morning');
        setGreetingIcon('sunny-outline');
      } else if (hour >= 12 && hour < 18) {
        setGreeting('Good Afternoon');
        setGreetingIcon('partly-sunny-outline');
      } else if (hour >= 18 && hour < 22) {
        setGreeting('Good Evening');
        setGreetingIcon('cloudy-night-outline');
      } else {
        setGreeting('Good Night');
        setGreetingIcon('moon-outline');
      }
    };

    updateGreeting(); // Set the initial greeting
    const intervalId = setInterval(updateGreeting, 60000); // Update every minute

    // Clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const fetchMood = useCallback(async () => {
    const now = Date.now();
    // Cooldown: Do not fetch if the last fetch was less than 30 seconds ago
    if (now - lastFetchMoodTimeRef.current < 30000) {
      console.log(`[${new Date().toISOString()}] Mood recently fetched, skipping due to 30s cooldown.`);
      return;
    }
    // Prevent concurrent fetches
    if (isFetchingMoodRef.current) {
      console.log(`[${new Date().toISOString()}] Mood fetch already in progress, skipping.`);
      return;
    }

    isFetchingMoodRef.current = true;
    lastFetchMoodTimeRef.current = now; // Update last fetch time immediately
    console.log(`[${new Date().toISOString()}] --- Starting to fetch mood ---`);

    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/moods`, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Mood API response status:', res.status);

      if (!res.ok) {
        const errorBody = await res.text(); // Read as text first
        console.error(`Failed to fetch mood. Status: ${res.status}, Body: ${errorBody}`);
        if (res.status === 404) {
            setMood(null); // No mood logged yet, which is a valid state
        } else if (res.status === 429) {
            console.warn("Rate limit hit for mood API:", errorBody);
            // Optionally, set a specific error state or message for the user
        }
        return; // Stop execution
      }

      const entries = await res.json(); // Only parse as JSON if res.ok
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
    } catch (error) {
      console.error(`Error fetching today's mood:`, error);
    } finally {
      isFetchingMoodRef.current = false;
      console.log(`[${new Date().toISOString()}] --- Finished fetching mood ---`);
    }
  }, [getToken]);

  const fetchWeather = useCallback(async () => {
    const now = Date.now();
    // Cooldown: Do not fetch if the last fetch was less than 30 seconds ago
    if (now - lastFetchWeatherTimeRef.current < 30000) {
      console.log(`[${new Date().toISOString()}] Weather recently fetched, skipping due to 30s cooldown.`);
      return;
    }
    // Prevent concurrent fetches
    if (isFetchingWeatherRef.current) {
      console.log(`[${new Date().toISOString()}] Weather fetch already in progress, skipping.`);
      return;
    }

    isFetchingWeatherRef.current = true;
    lastFetchWeatherTimeRef.current = now; // Update last fetch time immediately
    console.log(`[${new Date().toISOString()}] --- Starting to fetch weather ---`);

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
      isFetchingWeatherRef.current = false;
      console.log(`[${new Date().toISOString()}] --- Finished fetching weather ---`);
    }
  }, []);

  const fetchAirQuality = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchAirQualityTimeRef.current < 30000) {
      console.log(`[${new Date().toISOString()}] Air quality recently fetched, skipping.`);
      return;
    }
    if (isFetchingAirQualityRef.current) {
      console.log(`[${new Date().toISOString()}] Air quality fetch already in progress, skipping.`);
      return;
    }

    isFetchingAirQualityRef.current = true;
    lastFetchAirQualityTimeRef.current = now;
    console.log(`[${new Date().toISOString()}] --- Starting to fetch air quality ---`);

    setLoadingAirQuality(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorAirPollution('Permission to access location was denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const apiKey = Constants.expoConfig?.extra?.openWeatherApiKey;
      if (!apiKey) {
        setErrorAirPollution('API key not configured');
        return;
      }

      const res = await fetch(
        `http://api.openweathermap.org/data/2.5/air_pollution?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&appid=${apiKey}`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.list && data.list.length > 0) {
        setAirQuality({ aqi: data.list[0].main.aqi });
        setErrorAirPollution(null);
      } else {
        throw new Error('No air quality data found');
      }
    } catch (err: any) {
      console.error('Air quality fetch error:', err.message);
      setErrorAirPollution('Failed to fetch air quality');
    } finally {
      setLoadingAirQuality(false);
      isFetchingAirQualityRef.current = false;
      console.log(`[${new Date().toISOString()}] --- Finished fetching air quality ---`);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        // Stagger the API calls to avoid hitting rate limits
        await fetchMood();
        setTimeout(() => refetchHabits(), 500); // Fetch habits after a short delay
        setTimeout(() => fetchWeather(), 1000); // Fetch weather after a bit longer delay
        setTimeout(() => fetchAirQuality(), 1500); // Fetch air quality after weather
      };

      fetchData();
    }, [fetchMood, fetchWeather, refetchHabits, fetchAirQuality])
  );

  const handleEmergency = () => {
    router.push('/emergency' as any);
  };

  const completedHabits = habits.filter((h: Habit) => h.completedToday).length;
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
      value: loadingWeather ? '...' : errorMsg || (weather ? `${weather.temperature}°C, ${weather.description}` : 'No location'),
      icon: 'cloud-outline',
      color: colors.primary,
    },
    {
      title: 'Air Quality',
      value: loadingAirQuality
        ? 'Loading...'
        : errorAirPollution || (airQuality ? `${getAqiLabel(airQuality.aqi)} (AQI: ${airQuality.aqi})` : 'Unavailable'),
      icon: 'leaf-outline',
      color: airQuality ? getAqiColor(airQuality.aqi) : colors.textLight,
    },
  ];

  return (
    <View style={[commonStyles.container, { paddingTop: Platform.OS === 'ios' ? 40 : 20 }]}>
      <ScrollView
        style={commonStyles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={textStyles.h1}>{greeting}!</Text>
            <Icon name={greetingIcon} size={36} color={colors.primary} style={{ marginLeft: 12, transform: [{ translateY: -2 }] }} />
          </View>
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
