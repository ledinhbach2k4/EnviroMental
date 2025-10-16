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
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, commonStyles, textStyles } from '../../assets/styles/commonStyles';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { API_URL } from '../../constants/api';
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
const moodColors = [colors.moodVerySad, colors.moodSad, colors.moodNeutral, colors.moodHappy, colors.moodVeryHappy];
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

// Main Component
export default function Home() {
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

  // Cooldown Refs
  const isFetchingMoodRef = useRef(false);
  const lastFetchMoodTimeRef = useRef(0);
  const isFetchingWeatherRef = useRef(false);
  const lastFetchWeatherTimeRef = useRef(0);
  const isFetchingAirQualityRef = useRef(false);
  const lastFetchAirQualityTimeRef = useRef(0);

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
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/moods`, { headers: { Authorization: `Bearer ${token}` } });
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
  }, [getToken]);

  const fetchWeather = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchWeatherTimeRef.current < 30000) {
      return;
    }
    if (isFetchingWeatherRef.current) {
      return;
    }

    isFetchingWeatherRef.current = true;
    lastFetchWeatherTimeRef.current = now;
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
    }
  }, []);

  const fetchAirQuality = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchAirQualityTimeRef.current < 30000) {
      return;
    }
    if (isFetchingAirQualityRef.current) {
      return;
    }

    isFetchingAirQualityRef.current = true;
    lastFetchAirQualityTimeRef.current = now;
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
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&appid=${apiKey}`
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
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        await fetchMood();
        setTimeout(() => refetchHabits(), 500);
        setTimeout(() => fetchWeather(), 1000);
        setTimeout(() => fetchAirQuality(), 1500);
      };
      fetchData();
    }, [fetchMood, fetchWeather, refetchHabits, fetchAirQuality])
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
        const recentEntries = dayEntries.slice(-10); // Limit to last 10 entries for clarity
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
        data: dataPoints.map(p => p ?? 0), // Replace null with 0 for chart
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2,
      }],
      legend: [`${timeRange}ly Mood Trend`]
    };
  }, [moodEntries, timeRange]);

  // Other Logic
  const handleEmergency = () => router.push('/emergency' as any);
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

  // Render
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

        {loadingMood ? (
          <View style={[commonStyles.card, { marginBottom: 24, justifyContent: 'center', alignItems: 'center' }]}>
            <Text>Loading mood chart...</Text>
          </View>
        ) : processedChartData ? (
          <View style={[commonStyles.card, { marginBottom: 24 }]}>
            <View style={commonStyles.spaceBetween}>
              <Text style={textStyles.h3}>{timeRange}ly Mood Chart</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 }}>
              {TIME_RANGES.map(range => (
                <TouchableOpacity
                  key={range}
                  onPress={() => setTimeRange(range)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    backgroundColor: timeRange === range ? colors.primary : 'transparent',
                  }}
                >
                  <Text style={{ color: timeRange === range ? 'white' : colors.primary, fontWeight: '600' }}>{range}</Text>
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
                propsForBackgroundLines: { strokeDasharray: '' }, // solid lines
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16 }}
              fromZero
              // This function formats the labels on the Y-axis
              formatYLabel={(y) => Math.round(parseFloat(y)).toString()}
            />
          </View>
        ) : (
          <View style={[commonStyles.card, { marginBottom: 24, justifyContent: 'center', alignItems: 'center' }]}>
            <Text>No mood data available to display chart.</Text>
          </View>
        )}

        {/* Rest of the UI remains the same */}
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