import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { ENV } from '../../constants/api';
import { useSharedHabits } from '../../context/HabitsContext';
import type { Habit } from '../../hooks/useHabits';

// Interfaces
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

interface MoodEntry {
  moodLevel: number;
  createdAt: string;
}

// Constants
const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
const TIME_RANGES = ['Day', 'Week', 'Month', 'Year'] as const;
type TimeRange = typeof TIME_RANGES[number];

// Helper Functions
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

const CardContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const AndroidCardContent = ({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) => (
  <View style={style}>{children}</View>
);
const CardWrapper = Platform.OS === 'android' ? AndroidCardContent : CardContent;

// Main Component
export default function Home() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();

  const moodColors = useMemo(() => [
    colors.mood.verySad,
    colors.mood.sad,
    colors.mood.neutral,
    colors.mood.happy,
    colors.mood.veryHappy,
  ], [colors.mood.verySad, colors.mood.sad, colors.mood.neutral, colors.mood.happy, colors.mood.veryHappy]);

  // State
  const [greeting, setGreeting] = useState('');
  const [greetingIcon, setGreetingIcon] = useState<keyof typeof Ionicons.glyphMap>('sunny-outline');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mood, setMood] = useState<MoodData | null>(null);
  const [loadingMood, setLoadingMood] = useState(true);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('Day');
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [loadingAirQuality, setLoadingAirQuality] = useState(true);
  const [errorAirPollution, setErrorAirPollution] = useState<string | null>(null);

  // Hooks
  const { getToken } = useAuth();
  const { habits, loading: habitsLoading, refetch: refetchHabits } = useSharedHabits();

  // Create a ref to hold the unstable getToken function
  const tokenRef = useRef(getToken);
  useEffect(() => {
    tokenRef.current = getToken;
  }, [getToken]);

  // Cooldown Refs
  const isFetchingMoodRef = useRef(false);
  const lastFetchMoodTimeRef = useRef(0);
  const isFetchingWeatherRef = useRef(false);
  const lastFetchWeatherTimeRef = useRef(0);
  const isFetchingAirQualityRef = useRef(false);
  const lastFetchAirQualityTimeRef = useRef(0);
  const isFetchingHabitsRef = useRef(false);
  const lastFetchHabitsTimeRef = useRef(0);

  // Location permission refs
  const locationPermissionDeniedRef = useRef(false);
  const lastLocationErrorTimeRef = useRef(0);
  const LOCATION_ERROR_COOLDOWN = 5 * 60 * 1000;

  // Effects
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
    updateGreeting();
    const intervalId = setInterval(updateGreeting, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Data Fetching
  const fetchMood = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchMoodTimeRef.current < 30000) return;
    if (isFetchingMoodRef.current) return;

    isFetchingMoodRef.current = true;
    lastFetchMoodTimeRef.current = now;
    setLoadingMood(true);

    try {
      const token = await tokenRef.current();
      if (!token) return;

      const url = `${ENV.API_URL}/moods`;
      console.log('[Home] Fetching moods from:', url);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (res.status === 404) {
          setMoodEntries([]);
          setMood(null);
        }
        return;
      }

      const entries: MoodEntry[] = await res.json();
      const sortedEntries = entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMoodEntries(sortedEntries);

      if (sortedEntries.length > 0) {
        const latestMood = sortedEntries[sortedEntries.length - 1];
        setMood({ value: moodEmojis[latestMood.moodLevel], color: moodColors[latestMood.moodLevel] });
      } else {
        setMood(null);
      }
    } catch (error) {
      console.error(`Error fetching mood:`, error);
      setMoodEntries([]);
      setMood(null);
    } finally {
      isFetchingMoodRef.current = false;
      setLoadingMood(false);
    }
  }, [moodColors]);

  const fetchWeather = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchWeatherTimeRef.current < 30000) return;
    if (now - lastLocationErrorTimeRef.current < LOCATION_ERROR_COOLDOWN) return;
    if (isFetchingWeatherRef.current) return;
    if (locationPermissionDeniedRef.current) {
      setErrorMsg('Location permission denied. Enable in settings to use weather.');
      setLoadingWeather(false);
      return;
    }

    isFetchingWeatherRef.current = true;
    lastFetchWeatherTimeRef.current = now;
    setLoadingWeather(true);
    try {
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      if (currentStatus === 'denied') {
        locationPermissionDeniedRef.current = true;
        lastLocationErrorTimeRef.current = now;
        setErrorMsg('Location permission denied. Enable in settings to use weather.');
        return;
      }
      if (currentStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'denied') {
          locationPermissionDeniedRef.current = true;
          lastLocationErrorTimeRef.current = now;
          setErrorMsg('Location permission denied. Enable in settings to use weather.');
          return;
        }
        if (status !== 'granted') {
          lastLocationErrorTimeRef.current = now;
          setErrorMsg('Permission to access location was denied');
          return;
        }
      }

      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({});
      } catch (locErr: any) {
        console.warn('Location unavailable, using fallback:', locErr.message);
        loc = { coords: { latitude: 40.7128, longitude: -74.0060 } };
      }

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
      locationPermissionDeniedRef.current = false;
    } catch (err: any) {
      console.error('Weather fetch error:', err.message);
      if (err.message?.includes('location') || err.message?.includes('permission') || err.message?.includes('GPS') || err.message?.includes('unavailable')) {
        lastLocationErrorTimeRef.current = now;
        setErrorMsg('Location unavailable. Weather data cannot be fetched.');
      } else {
        setErrorMsg('Failed to fetch weather data');
      }
    } finally {
      setLoadingWeather(false);
      isFetchingWeatherRef.current = false;
    }
  }, []);

  const fetchAirQuality = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchAirQualityTimeRef.current < 30000) return;
    if (now - lastLocationErrorTimeRef.current < LOCATION_ERROR_COOLDOWN) return;
    if (isFetchingAirQualityRef.current) return;
    if (locationPermissionDeniedRef.current) {
      setErrorAirPollution('Location permission denied. Enable in settings to use air quality.');
      setLoadingAirQuality(false);
      return;
    }

    isFetchingAirQualityRef.current = true;
    lastFetchAirQualityTimeRef.current = now;
    setLoadingAirQuality(true);
    try {
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      if (currentStatus === 'denied') {
        locationPermissionDeniedRef.current = true;
        lastLocationErrorTimeRef.current = now;
        setErrorAirPollution('Location permission denied. Enable in settings to use air quality.');
        return;
      }
      if (currentStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'denied') {
          locationPermissionDeniedRef.current = true;
          lastLocationErrorTimeRef.current = now;
          setErrorAirPollution('Location permission denied. Enable in settings to use air quality.');
          return;
        }
        if (status !== 'granted') {
          lastLocationErrorTimeRef.current = now;
          setErrorAirPollution('Permission to access location was denied');
          return;
        }
      }

      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({});
      } catch (locErr: any) {
        console.warn('Location unavailable, using fallback:', locErr.message);
        loc = { coords: { latitude: 40.7128, longitude: -74.0060 } };
      }

      const apiKey = Constants.expoConfig?.extra?.openWeatherApiKey;
      if (!apiKey) {
        setErrorAirPollution('API key not configured');
        return;
      }

      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&appid=${apiKey}`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.list && data.list.length > 0) {
        setAirQuality({ aqi: data.list[0].main.aqi });
        setErrorAirPollution(null);
        locationPermissionDeniedRef.current = false;
      } else {
        throw new Error('No air quality data found');
      }
    } catch (err: any) {
      console.error('Air quality fetch error:', err.message);
      if (err.message?.includes('location') || err.message?.includes('permission') || err.message?.includes('GPS') || err.message?.includes('unavailable')) {
        lastLocationErrorTimeRef.current = now;
        setErrorAirPollution('Location unavailable. Air quality data cannot be fetched.');
      } else {
        setErrorAirPollution('Failed to fetch air quality');
      }
    } finally {
      setLoadingAirQuality(false);
      isFetchingAirQualityRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        await fetchMood();
        const now = Date.now();
        if (!isFetchingHabitsRef.current && now - lastFetchHabitsTimeRef.current >= 30000) {
          isFetchingHabitsRef.current = true;
          lastFetchHabitsTimeRef.current = now;
          try {
            await refetchHabits();
          } finally {
            isFetchingHabitsRef.current = false;
          }
        }
        setTimeout(() => fetchWeather(), 1000);
        setTimeout(() => fetchAirQuality(), 1500);
      };
      fetchData();
    }, [])
  );

  // Chart Data Processing
  const processedChartData = useMemo(() => {
    if (moodEntries.length === 0) return null;

    const now = new Date();
    let labels: string[] = [];
    let dataPoints: (number | null)[] = [];

    switch (timeRange) {
      case 'Day': {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const dayEntries = moodEntries.filter(e => new Date(e.createdAt) > oneDayAgo);
        const recentEntries = dayEntries.slice(-10);
        labels = recentEntries.map(e => new Date(e.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
        dataPoints = recentEntries.map(e => e.moodLevel);
        break;
      }
      case 'Week': {
        const weekData = Array(7).fill(null);
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = now.getDay();
        labels = Array(7).fill(0).map((_, i) => dayLabels[(today - 6 + i + 7) % 7]);

        for (let i = 0; i < 7; i++) {
          const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const dayEntries = moodEntries.filter(e => new Date(e.createdAt).toDateString() === day.toDateString());
          if (dayEntries.length > 0) {
            const avg = dayEntries.reduce((sum, e) => sum + e.moodLevel, 0) / dayEntries.length;
            weekData[6 - i] = avg;
          }
        }
        dataPoints = weekData;
        break;
      }
      case 'Month': {
        const monthData = Array(30).fill(null);
        labels = Array(30).fill(0).map((_, i) => `${new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i)).getDate()}`);

        for (let i = 0; i < 30; i++) {
          const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const dayEntries = moodEntries.filter(e => new Date(e.createdAt).toDateString() === day.toDateString());
          if (dayEntries.length > 0) {
            const avg = dayEntries.reduce((sum, e) => sum + e.moodLevel, 0) / dayEntries.length;
            monthData[29 - i] = avg;
          }
        }
        dataPoints = monthData;
        break;
      }
      case 'Year': {
        const yearData = Array(12).fill(null);
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = now.getMonth();
        labels = Array(12).fill(0).map((_, i) => monthLabels[(currentMonth - 11 + i + 12) % 12]);

        for (let i = 0; i < 12; i++) {
          const month = (now.getMonth() - i + 12) % 12;
          const year = now.getFullYear() - (i > now.getMonth() ? 1 : 0);
          const monthEntries = moodEntries.filter(e => {
            const d = new Date(e.createdAt);
            return d.getMonth() === month && d.getFullYear() === year;
          });
          if (monthEntries.length > 0) {
            const avg = monthEntries.reduce((sum, e) => sum + e.moodLevel, 0) / monthEntries.length;
            yearData[11 - i] = avg;
          }
        }
        dataPoints = yearData;
        break;
      }
    }

    if (dataPoints.every(p => p === null)) return null;

    return {
      labels,
      datasets: [{
        data: dataPoints.map(p => p ?? 0),
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2,
      }],
      legend: [`${timeRange}ly Mood Trend`]
    };
  }, [moodEntries, timeRange]);

  // Styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    spaceBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    fab: {
      position: 'absolute',
      bottom: spacing.lg,
      right: spacing.lg,
      width: 56,
      height: 56,
      borderRadius: radii.full,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.md,
    },
    disabled: {
      opacity: 0.5,
    },
  }), [colors, spacing, radii, shadows]);

  // Other Logic
  const handleEmergency = () => router.push('/emergency');
  const completedHabits = habits.filter((h: Habit) => h.completedToday).length;
  const totalHabits = habits.length;

  const quickStats: QuickStat[] = [
    {
      title: 'Mood',
      value: mood ? mood.value : 'No mood logged',
      icon: 'happy-outline',
      color: mood ? mood.color : colors.textMuted,
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
      color: airQuality ? (airQuality.aqi <= 2 ? colors.success : airQuality.aqi === 3 ? colors.warning : colors.danger) : colors.textMuted,
    },
  ];

  // Render
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text style={typography.h1}>{greeting}!</Text>
            <Icon name={greetingIcon} size={36} color={colors.primary} style={{ marginLeft: spacing.md, transform: [{ translateY: -2 }] }} />
          </View>
          <Text style={typography.bodySmall}>Take a moment for your mental health</Text>
        </View>

        <View style={[styles.card, { marginBottom: spacing.xl }]}>
          <CardWrapper>
            <Text style={typography.h3}>Quick Stats</Text>
            {quickStats.map((stat, index) => (
              <View
                key={index}
                style={[
                  styles.row,
                  { marginTop: spacing.lg, paddingBottom: spacing.lg },
                  index < quickStats.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Icon name={stat.icon} size={24} color={stat.color} style={{ marginRight: spacing.md }} />
                <View>
                  <Text style={typography.caption}>{stat.title}</Text>
                  <Text style={typography.body}>{stat.value}</Text>
                </View>
              </View>
            ))}
          </CardWrapper>
        </View>

        {loadingMood ? (
          <View style={[styles.card, { marginBottom: spacing.xl, justifyContent: 'center', alignItems: 'center' }]}>
            <Text>Loading mood chart...</Text>
          </View>
        ) : processedChartData ? (
          <View style={[styles.card, { marginBottom: spacing.xl }]}>
            <View style={styles.spaceBetween}>
              <Text style={typography.h3}>{timeRange === 'Day' ? 'Daily' : `${timeRange}ly`} Mood Chart</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: spacing.lg }}>
              {TIME_RANGES.map(range => (
                <TouchableOpacity
                  key={range}
                  onPress={() => setTimeRange(range)}
                  style={{
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.md,
                    borderRadius: radii.full,
                    backgroundColor: timeRange === range ? colors.primary : 'transparent',
                  }}
                >
                  <Text style={{ color: timeRange === range ? colors.textInverse : colors.primary, fontWeight: '600' }}>{range}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <LineChart
              data={processedChartData}
              width={Dimensions.get('window').width - 80}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
                propsForBackgroundLines: { strokeDasharray: '' },
              }}
              bezier
              style={{ marginVertical: spacing.md, borderRadius: 16 }}
              fromZero
              formatYLabel={(y) => Math.round(parseFloat(y)).toString()}
            />
          </View>
        ) : (
          <View style={[styles.card, { marginBottom: spacing.xl, justifyContent: 'center', alignItems: 'center' }]}>
            <Text>No mood data available to display chart.</Text>
          </View>
        )}

        <View style={{ marginBottom: spacing.xl }}>
          <TouchableOpacity style={[styles.card, { marginBottom: spacing.md }]} onPress={() => router.push('/(tabs)/mood')}>
            <CardWrapper>
              <View style={styles.spaceBetween}>
                <View style={styles.row}>
                  <Icon name="heart" size={24} color={colors.primary} style={{ marginRight: spacing.md }} />
                  <View>
                    <Text style={typography.body}>Log Mood</Text>
                    <Text style={typography.caption}>Track your emotional state</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </CardWrapper>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, { marginBottom: spacing.md }]} onPress={() => router.push('/forum')}>
            <CardWrapper>
              <View style={styles.spaceBetween}>
                <View style={styles.row}>
                  <Icon name="chatbubbles" size={24} color={colors.warning} style={{ marginRight: spacing.md }} />
                  <View>
                    <Text style={typography.body}>Community Forum</Text>
                    <Text style={typography.caption}>Connect with others</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </CardWrapper>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, { marginBottom: spacing.md }]} onPress={() => router.push('/(tabs)/mindfulness')}>
            <CardWrapper>
              <View style={styles.spaceBetween}>
                <View style={styles.row}>
                  <Icon name="leaf" size={24} color={colors.success} style={{ marginRight: spacing.md }} />
                  <View>
                    <Text style={typography.body}>Mindfulness</Text>
                    <Text style={typography.caption}>Find your inner peace</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </CardWrapper>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.card, { marginBottom: spacing.md }]} onPress={() => router.push('/(tabs)/habits')}>
            <CardWrapper>
              <View style={styles.spaceBetween}>
                <View style={styles.row}>
                  <Icon name="checkmark-circle" size={24} color={colors.success} style={{ marginRight: spacing.md }} />
                  <View>
                    <Text style={typography.body}>Check Habits</Text>
                    <Text style={typography.caption}>Mark today&apos;s progress</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </CardWrapper>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { borderColor: colors.danger + '30', marginBottom: spacing.xxl }]}>
          <CardWrapper>
            <View style={{ alignItems: 'center' }}>
              <Icon name="medical" size={32} color={colors.danger} style={{ marginBottom: spacing.lg }} />
              <Text style={[typography.h3, { color: colors.danger, marginBottom: spacing.sm }]}>
                Need Immediate Help?
              </Text>
              <Text style={[typography.caption, { textAlign: 'center', marginBottom: spacing.lg }]}>
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