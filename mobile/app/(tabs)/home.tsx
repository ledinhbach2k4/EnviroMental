import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  Platform,
  ScrollView,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleSheet,
  Modal,
  RefreshControl,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { animationTokens } from '@/src/design/tokens';
import { AnimatedPressable } from '../../components/motion/AnimatedPressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fetchWithTimeout from '../../utils/fetchWithTimeout';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import CortisolGaugeCard from '../../components/CortisolGaugeCard';
import { ENV } from '../../constants/api';
import { useSharedHabits } from '../../context/HabitsContext';
import { useCortisolScore } from '../../hooks/useCortisolScore';
import type { Habit } from '../../hooks/useHabits';

// Interfaces
interface QuickStat {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  hasRetry?: boolean;
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
type TimeRange = (typeof TIME_RANGES)[number];

const LOCATION_ERROR_COOLDOWN = 5 * 60 * 1000;
const WEATHER_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const AIR_QUALITY_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const MOOD_STALE_TIME = 60 * 1000; // 1 minute
const HABITS_STALE_TIME = 60 * 1000; // 1 minute
const CORTISOL_STALE_TIME = 60 * 1000; // 1 minute

// Helper Functions
const getAqiLabel = (aqi: number) => {
  switch (aqi) {
    case 1:
      return 'Good';
    case 2:
      return 'Fair';
    case 3:
      return 'Moderate';
    case 4:
      return 'Poor';
    case 5:
      return 'Very Poor';
    default:
      return 'Unknown';
  }
};

const setSharedValue = <T,>(sv: { value: T }, val: T) => {
  sv.value = val;
};

const CardContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const AndroidCardContent = ({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) => <View style={style}>{children}</View>;
const CardWrapper = Platform.OS === 'android' ? AndroidCardContent : CardContent;

function AnimatedTimeRangePill({
  range,
  isSelected,
  onPress,
  colors,
  radii,
  spacing,
}: {
  range: string;
  isSelected: boolean;
  onPress: () => void;
  colors: any;
  radii: any;
  spacing: any;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9, animationTokens.springs.bouncy),
      withSpring(1, animationTokens.springs.gentle)
    );
    onPress();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={{
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radii.full,
          backgroundColor: isSelected ? colors.primary : 'transparent',
        }}
      >
        <Text
          style={{
            color: isSelected ? colors.textInverse : colors.primary,
            fontWeight: '600',
          }}
        >
          {range}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Main Component
export default function Home() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  const insets = useSafeAreaInsets();

  const moodColors = useMemo(
    () => [
      colors.mood.verySad,
      colors.mood.sad,
      colors.mood.neutral,
      colors.mood.happy,
      colors.mood.veryHappy,
    ],
    [
      colors.mood.verySad,
      colors.mood.sad,
      colors.mood.neutral,
      colors.mood.happy,
      colors.mood.veryHappy,
    ]
  );

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

  // Emergency Modal State
  const [isEmergencyModalVisible, setIsEmergencyModalVisible] = useState(false);
  const [emergencyStep, setEmergencyStep] = useState<1 | 2>(1);
  const [selectedTarget, setSelectedTarget] = useState<{ title: string; phone: string } | null>(
    null
  );
  const [currentLocation, setCurrentLocation] = useState<string>('Updating your location...');
  const [locationFetched, setLocationFetched] = useState(false);
  const swipeAnim = useSharedValue(0);
  const maxSlide = useMemo(() => Dimensions.get('window').width - 100, []);
  const swipeThreshold = useMemo(() => Dimensions.get('window').width * 0.75, []);

  const closeEmergencyModal = useCallback(() => {
    setEmergencyStep(1);
    setSelectedTarget(null);
    setCurrentLocation('Updating your location...');
    setLocationFetched(false);
    setIsEmergencyModalVisible(false);
    setSharedValue(swipeAnim, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerEmergencyCall = useCallback(() => {
    if (selectedTarget) {
      Linking.openURL(`tel:${selectedTarget.phone}`);
    }
    closeEmergencyModal();
  }, [selectedTarget, closeEmergencyModal]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setSharedValue(swipeAnim, 0);
        },
        onPanResponderMove: (_, gesture) => {
          const translateX = Math.max(0, Math.min(gesture.dx, maxSlide));
          setSharedValue(swipeAnim, translateX);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx >= swipeThreshold) {
            setSharedValue(
              swipeAnim,
              withSpring(maxSlide, animationTokens.springs.gentle, (finished) => {
                if (finished) {
                  runOnJS(triggerEmergencyCall)();
                }
              })
            );
          } else {
            setSharedValue(swipeAnim, withSpring(0, animationTokens.springs.gentle));
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maxSlide, swipeThreshold, triggerEmergencyCall]
  );

  const swipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeAnim.value }],
  }));

  // Hooks
  const { getToken } = useAuth();
  const { habits, loading: habitsLoading, refetch: refetchHabits } = useSharedHabits();
  const {
    data: cortisolData,
    loading: cortisolLoading,
    error: cortisolError,
    refetch: refetchCortisol,
  } = useCortisolScore();

  // Create a ref to hold the unstable getToken function
  const tokenRef = useRef(getToken);
  useEffect(() => {
    tokenRef.current = getToken;
  }, [getToken]);

  // Cooldown & Stale-Tracking Refs
  const isInitialMountRef = useRef(true);
  const isFetchingMoodRef = useRef(false);
  const lastFetchMoodTimeRef = useRef(0);
  const isFetchingWeatherRef = useRef(false);
  const lastFetchWeatherTimeRef = useRef(0);
  const isFetchingAirQualityRef = useRef(false);
  const lastFetchAirQualityTimeRef = useRef(0);
  const lastFetchHabitsTimeRef = useRef(0);
  const lastFetchCortisolTimeRef = useRef(0);

  // Sync refs with state to prevent stale closures and avoid flashing spinners when data already exists
  const weatherRef = useRef<WeatherData | null>(null);
  const moodEntriesRef = useRef<MoodEntry[]>([]);
  const airQualityRef = useRef<AirQualityData | null>(null);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    moodEntriesRef.current = moodEntries;
  }, [moodEntries]);

  useEffect(() => {
    airQualityRef.current = airQuality;
  }, [airQuality]);

  const [refreshing, setRefreshing] = useState(false);

  // Location permission refs
  const locationPermissionDeniedRef = useRef(false);
  const lastLocationErrorTimeRef = useRef(0);

  // Reset permission denied state - call when user might have granted permission
  const resetPermissionState = useCallback(() => {
    locationPermissionDeniedRef.current = false;
    lastLocationErrorTimeRef.current = 0;
  }, []);

  // Emergency Modal Helpers
  const fetchCurrentLocation = useCallback(async () => {
    setCurrentLocation('Updating your location...');
    setLocationFetched(false);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          setCurrentLocation('Location permission denied');
          return;
        }
      }
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(
        `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}`
      );
      setLocationFetched(true);
    } catch (error) {
      console.error('Failed to get location:', error);
      setCurrentLocation('Unable to fetch location');
    }
  }, []);

  const handleEmergencyOptionPress = useCallback(
    (target: { title: string; phone: string }) => {
      setSelectedTarget(target);
      setEmergencyStep(2);
      // Fetch location immediately when entering step 2
      fetchCurrentLocation();
    },
    [fetchCurrentLocation]
  );

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

  // Explicitly request location permissions on mount so the OS shows the prompt
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
          if (newStatus !== 'granted') {
            console.log('Location permission not granted');
            locationPermissionDeniedRef.current = true;
            setErrorMsg('Location permission required for weather & air quality data.');
          } else {
            locationPermissionDeniedRef.current = false;
          }
        } else {
          locationPermissionDeniedRef.current = false;
        }
      } catch (e) {
        console.log('Location permission request failed:', e);
      }
    })();
  }, []);

  // Data Fetching
  const fetchMood = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastFetchMoodTimeRef.current < MOOD_STALE_TIME) return;
      if (isFetchingMoodRef.current) return;

      isFetchingMoodRef.current = true;
      lastFetchMoodTimeRef.current = now;

      // Only show full loading spinner if we don't already have mood entries displayed
      if (moodEntriesRef.current.length === 0) {
        setLoadingMood(true);
      }

      // 1. STALE: Show cached data immediately if memory state is empty
      if (moodEntriesRef.current.length === 0) {
        try {
          const cached = await AsyncStorage.getItem('cached_moods');
          if (cached) {
            const parsed: MoodEntry[] = JSON.parse(cached);
            const sorted = parsed.sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            setMoodEntries(sorted);
            if (sorted.length > 0) {
              const latest = sorted[sorted.length - 1];
              setMood({
                value: moodEmojis[latest.moodLevel],
                color: moodColors[latest.moodLevel],
              });
            }
          }
        } catch {
          /* ignore cache read errors */
        }
      }

      // 2. REVALIDATE: Fetch fresh data from API
      try {
        const token = await tokenRef.current();
        if (!token) return;

        const url = `${ENV.API_URL}/moods`;
        console.log('[Home] Fetching moods from:', url);
        const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          if (res.status === 404) {
            setMoodEntries([]);
            setMood(null);
          }
          return;
        }

        const entries: MoodEntry[] = await res.json();
        const sortedEntries = entries.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMoodEntries(sortedEntries);

        if (sortedEntries.length > 0) {
          const latestMood = sortedEntries[sortedEntries.length - 1];
          setMood({
            value: moodEmojis[latestMood.moodLevel],
            color: moodColors[latestMood.moodLevel],
          });
        } else {
          setMood(null);
        }

        // Save to cache
        await AsyncStorage.setItem('cached_moods', JSON.stringify(entries));
      } catch (error) {
        console.error(`Error fetching mood:`, error);
        // Keep stale data on screen — no setState to clear entries
      } finally {
        isFetchingMoodRef.current = false;
        setLoadingMood(false);
      }
    },
    [moodColors]
  );

  const fetchWeather = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchWeatherTimeRef.current < WEATHER_STALE_TIME) return;
    if (now - lastLocationErrorTimeRef.current < LOCATION_ERROR_COOLDOWN) return;
    if (isFetchingWeatherRef.current) return;
    if (locationPermissionDeniedRef.current) {
      setErrorMsg('Location permission denied. Enable in settings to use weather.');
      setLoadingWeather(false);
      return;
    }

    isFetchingWeatherRef.current = true;
    lastFetchWeatherTimeRef.current = now;

    // Only show loading indicator if we don't already have weather data
    if (!weatherRef.current) {
      setLoadingWeather(true);
    }

    // 1. STALE: Show cached weather immediately if not in state
    if (!weatherRef.current) {
      try {
        const cached = await AsyncStorage.getItem('cached_weather');
        if (cached) {
          setWeather(JSON.parse(cached));
        }
      } catch {
        /* ignore cache read errors */
      }
    }

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
        loc = { coords: { latitude: 40.7128, longitude: -74.006 } };
      }

      const apiKey = Constants.expoConfig?.extra?.openWeatherApiKey;
      if (!apiKey) {
        setErrorMsg('Weather API key not configured');
        return;
      }

      const res = await fetchWithTimeout(
        `https://api.openweathermap.org/data/2.5/weather?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&units=metric&appid=${apiKey}`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const weatherData = {
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        city: data.name,
      };
      setWeather(weatherData);
      setErrorMsg(null);
      locationPermissionDeniedRef.current = false;
      await AsyncStorage.setItem('cached_weather', JSON.stringify(weatherData));
    } catch (err: any) {
      console.error('Weather fetch error:', err.message);
      // Keep stale weather on screen; only surface location-specific errors
      if (err.name === 'AbortError') {
        console.warn('Weather fetch timed out');
        return;
      }
      if (
        err.message?.includes('location') ||
        err.message?.includes('permission') ||
        err.message?.includes('GPS') ||
        err.message?.includes('unavailable')
      ) {
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

  const fetchAirQuality = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchAirQualityTimeRef.current < AIR_QUALITY_STALE_TIME) return;
    if (now - lastLocationErrorTimeRef.current < LOCATION_ERROR_COOLDOWN) return;
    if (isFetchingAirQualityRef.current) return;
    if (locationPermissionDeniedRef.current) {
      setErrorAirPollution('Location permission denied. Enable in settings to use air quality.');
      setLoadingAirQuality(false);
      return;
    }

    isFetchingAirQualityRef.current = true;
    lastFetchAirQualityTimeRef.current = now;

    // Only show loading indicator if we don't already have air quality data
    if (!airQualityRef.current) {
      setLoadingAirQuality(true);
    }

    // 1. STALE: Show cached air quality immediately if not in state
    if (!airQualityRef.current) {
      try {
        const cached = await AsyncStorage.getItem('cached_air_quality');
        if (cached) {
          setAirQuality(JSON.parse(cached));
        }
      } catch {
        /* ignore cache read errors */
      }
    }

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
          setErrorAirPollution(
            'Location permission denied. Enable in settings to use air quality.'
          );
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
        loc = { coords: { latitude: 40.7128, longitude: -74.006 } };
      }

      const apiKey = Constants.expoConfig?.extra?.openWeatherApiKey;
      if (!apiKey) {
        setErrorAirPollution('API key not configured');
        return;
      }

      const res = await fetchWithTimeout(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&appid=${apiKey}`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.list && data.list.length > 0) {
        const aqiData = { aqi: data.list[0].main.aqi };
        setAirQuality(aqiData);
        setErrorAirPollution(null);
        locationPermissionDeniedRef.current = false;
        await AsyncStorage.setItem('cached_air_quality', JSON.stringify(aqiData));
      } else {
        throw new Error('No air quality data found');
      }
    } catch (err: any) {
      console.error('Air quality fetch error:', err.message);
      // Keep stale air quality on screen; only surface location-specific errors
      if (err.name === 'AbortError') {
        console.warn('Air quality fetch timed out');
        return;
      }
      if (
        err.message?.includes('location') ||
        err.message?.includes('permission') ||
        err.message?.includes('GPS') ||
        err.message?.includes('unavailable')
      ) {
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

  // Optimized Tab Focus Effect with Stale Thresholds
  useFocusEffect(
    useCallback(() => {
      resetPermissionState();

      const now = Date.now();
      const isInitial = isInitialMountRef.current;
      if (isInitial) {
        isInitialMountRef.current = false;
      }

      // 1. Mood: 1 minute threshold
      if (isInitial || now - lastFetchMoodTimeRef.current >= MOOD_STALE_TIME) {
        fetchMood();
      }

      // 2. Habits: 1 minute threshold
      if (isInitial || now - lastFetchHabitsTimeRef.current >= HABITS_STALE_TIME) {
        lastFetchHabitsTimeRef.current = now;
        refetchHabits();
      }

      // 3. Cortisol: 1 minute threshold
      if (isInitial || now - lastFetchCortisolTimeRef.current >= CORTISOL_STALE_TIME) {
        lastFetchCortisolTimeRef.current = now;
        refetchCortisol();
      }

      // 4. Weather: 5 minutes threshold
      if (isInitial || now - lastFetchWeatherTimeRef.current >= WEATHER_STALE_TIME) {
        if (isInitial) {
          setTimeout(() => fetchWeather(), 600);
        } else {
          fetchWeather();
        }
      }

      // 5. Air Quality: 5 minutes threshold
      if (isInitial || now - lastFetchAirQualityTimeRef.current >= AIR_QUALITY_STALE_TIME) {
        if (isInitial) {
          setTimeout(() => fetchAirQuality(), 1200);
        } else {
          fetchAirQuality();
        }
      }
    }, [
      fetchMood,
      fetchWeather,
      fetchAirQuality,
      refetchHabits,
      refetchCortisol,
      resetPermissionState,
    ])
  );

  // Pull-to-refresh handler for manual user refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        fetchMood(true),
        refetchHabits(true),
        refetchCortisol(true),
        fetchWeather(true),
        fetchAirQuality(true),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchMood, refetchHabits, refetchCortisol, fetchWeather, fetchAirQuality]);

  // Chart Data Processing
  const processedChartData = useMemo(() => {
    if (moodEntries.length === 0) return null;

    const now = new Date();
    let labels: string[] = [];
    let dataPoints: (number | null)[] = [];

    switch (timeRange) {
      case 'Day': {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const dayEntries = moodEntries.filter((e) => new Date(e.createdAt) > oneDayAgo);
        const recentEntries = dayEntries.slice(-10);
        labels = recentEntries.map((e) =>
          new Date(e.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        );
        dataPoints = recentEntries.map((e) => e.moodLevel);
        break;
      }
      case 'Week': {
        const weekData = Array(7).fill(null);
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = now.getDay();
        labels = Array(7)
          .fill(0)
          .map((_, i) => dayLabels[(today - 6 + i + 7) % 7]);

        for (let i = 0; i < 7; i++) {
          const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const dayEntries = moodEntries.filter(
            (e) => new Date(e.createdAt).toDateString() === day.toDateString()
          );
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
        labels = Array(30)
          .fill(0)
          .map(
            (_, i) =>
              `${new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i)).getDate()}`
          );

        for (let i = 0; i < 30; i++) {
          const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const dayEntries = moodEntries.filter(
            (e) => new Date(e.createdAt).toDateString() === day.toDateString()
          );
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
        const monthLabels = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const currentMonth = now.getMonth();
        labels = Array(12)
          .fill(0)
          .map((_, i) => monthLabels[(currentMonth - 11 + i + 12) % 12]);

        for (let i = 0; i < 12; i++) {
          const month = (now.getMonth() - i + 12) % 12;
          const year = now.getFullYear() - (i > now.getMonth() ? 1 : 0);
          const monthEntries = moodEntries.filter((e) => {
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

    if (dataPoints.every((p) => p === null)) return null;

    return {
      labels,
      datasets: [
        {
          data: dataPoints.map((p) => p ?? 0),
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: [`${timeRange}ly Mood Trend`],
    };
  }, [moodEntries, timeRange]);

  // Styles
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        },
        cardSmall: {
          backgroundColor: colors.surface,
          padding: spacing.md,
          marginVertical: spacing.xs,
          ...shadows.xs,
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
          width: spacing.xxxl + spacing.md,
          height: spacing.xxxl + spacing.md,
          borderRadius: radii.full,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.md,
        },
        disabled: {
          opacity: 0.5,
        },
        // Emergency Modal Styles
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        },
        modalContainer: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl + insets.bottom,
          maxHeight: '85%',
          ...shadows.lg,
        },
        closeButton: {
          position: 'absolute',
          top: spacing.sm,
          right: spacing.sm,
          zIndex: 10,
          padding: spacing.xs,
        },
        modalContent: {
          width: '100%',
        } as ViewStyle,
        optionButton: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          ...shadows.xs,
        },
        optionIconWrapper: {
          width: 56,
          height: 56,
          borderRadius: radii.full,
          backgroundColor: colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        },
        optionTextWrapper: {
          flex: 1,
        },
        locationCard: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primary + '10',
          borderRadius: radii.md,
          padding: spacing.md,
          marginBottom: spacing.xl,
          borderWidth: 1,
          borderColor: colors.primary + '30',
        },
        swipeContainer: {
          marginTop: spacing.md,
        },
        swipeTrack: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          backgroundColor: colors.danger,
          borderRadius: radii.full,
          paddingHorizontal: spacing.md,
          overflow: 'hidden',
          ...shadows.md,
        },
        swipeThumb: {
          width: 64,
          height: 64,
          borderRadius: radii.full,
          backgroundColor: colors.textInverse,
          alignItems: 'center',
          justifyContent: 'center',
          ...shadows.md,
        },
        swipeLabel: {
          flex: 1,
          textAlign: 'center',
          marginRight: 64,
        },
      }),
    [colors, spacing, radii, shadows, insets]
  );

  // Other Logic
  const handleEmergency = () => {
    setIsEmergencyModalVisible(true);
    setEmergencyStep(1);
    setSelectedTarget(null);
  };
  const completedHabits = habits.filter((h: Habit) => h.completedToday).length;
  const totalHabits = habits.length;

  const handleStatRetry = (title: string) => {
    if (title === 'Current Weather') {
      fetchWeather(true);
    } else if (title === 'Air Quality') {
      fetchAirQuality(true);
    }
  };

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
      value: loadingWeather
        ? '...'
        : errorMsg ||
          (weather ? `${weather.temperature}°C, ${weather.description}` : 'No location'),
      icon: 'cloud-outline',
      color: colors.primary,
      hasRetry: !!errorMsg,
    },
    {
      title: 'Air Quality',
      value: loadingAirQuality
        ? 'Loading...'
        : errorAirPollution ||
          (airQuality ? `${getAqiLabel(airQuality.aqi)} (AQI: ${airQuality.aqi})` : 'Unavailable'),
      icon: 'leaf-outline',
      color: airQuality
        ? airQuality.aqi <= 2
          ? colors.success
          : airQuality.aqi === 3
            ? colors.warning
            : colors.danger
        : colors.textMuted,
      hasRetry: !!errorAirPollution,
    },
  ];

  // Render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Animated.View
          entering={FadeInDown.delay(50).springify().damping(20)}
          style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text style={typography.h1}>{greeting}!</Text>
            <Icon
              name={greetingIcon}
              size={36}
              color={colors.primary}
              style={{ marginLeft: spacing.md, transform: [{ translateY: -2 }] }}
            />
          </View>
          <Text style={typography.bodySmall}>Take a moment for your mental health</Text>
        </Animated.View>

        {/* Cortisol Risk Score Card */}
        <Animated.View
          entering={FadeInDown.delay(120).springify().damping(20)}
          style={{ marginBottom: spacing.lg }}
        >
          <CardWrapper>
            <CortisolGaugeCard
              score={cortisolData?.score ?? null}
              category={cortisolData?.category ?? 'unknown'}
              label={cortisolData?.label ?? 'Insufficient Data'}
              breakdown={cortisolData?.breakdown ?? { mood: null, habits: null, environment: null }}
              message={cortisolData?.message ?? ''}
              loading={cortisolLoading}
              error={cortisolError}
              onRetry={refetchCortisol}
              warnings={cortisolData?.warnings ?? []}
              circadianMultiplier={cortisolData?.circadianMultiplier ?? 1}
              timestamp={cortisolData?.timestamp}
            />
          </CardWrapper>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(190).springify().damping(20)}
          style={[styles.card, { marginBottom: spacing.xl }]}
        >
          <CardWrapper>
            <Text style={typography.h3}>Quick Stats</Text>
            {quickStats.map((stat, index) => (
              <View
                key={index}
                style={[
                  styles.row,
                  { marginTop: spacing.lg, paddingBottom: spacing.lg },
                  index < quickStats.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border + '50',
                  },
                ]}
              >
                <Icon
                  name={stat.icon}
                  size={24}
                  color={stat.color}
                  style={{ marginRight: spacing.md }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={typography.caption}>{stat.title}</Text>
                  <Text style={typography.body}>{stat.value}</Text>
                </View>
                {stat.hasRetry && (
                  <TouchableOpacity
                    onPress={() => handleStatRetry(stat.title)}
                    style={{ padding: spacing.xs, marginLeft: spacing.md }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </CardWrapper>
        </Animated.View>

        {loadingMood ? (
          <View
            style={[
              styles.card,
              { marginBottom: spacing.xl, justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <Text>Loading mood chart...</Text>
          </View>
        ) : processedChartData ? (
          <Animated.View
            entering={FadeInDown.delay(260).springify().damping(20)}
            style={[styles.card, { marginBottom: spacing.xl }]}
          >
            <View style={styles.spaceBetween}>
              <Text style={typography.h3}>
                {timeRange === 'Day' ? 'Daily' : `${timeRange}ly`} Mood Chart
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginVertical: spacing.lg,
              }}
            >
              {TIME_RANGES.map((range) => (
                <AnimatedTimeRangePill
                  key={range}
                  range={range}
                  isSelected={timeRange === range}
                  onPress={() => setTimeRange(range)}
                  colors={colors}
                  radii={radii}
                  spacing={spacing}
                />
              ))}
            </View>
            <LineChart
              data={processedChartData}
              width={Dimensions.get('window').width - 80}
              height={256}
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
              style={{
                marginVertical: spacing.md,
                borderRadius: 16,
                paddingRight: 32,
                paddingTop: 16,
              }}
              fromZero
              formatYLabel={(y) => Math.round(parseFloat(y)).toString()}
            />
          </Animated.View>
        ) : (
          <View
            style={[
              styles.card,
              { marginBottom: spacing.xl, justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <Text>No mood data available to display chart.</Text>
          </View>
        )}

        <View style={{ marginBottom: spacing.xl }}>
          <Animated.View entering={FadeInDown.delay(320).springify().damping(20)}>
            <AnimatedPressable
              scaleTo={animationTokens.micro.cardPressScale}
              style={[styles.card, { marginBottom: spacing.md }]}
              onPress={() => router.push('/(tabs)/mood')}
            >
              <CardWrapper>
                <View style={styles.spaceBetween}>
                  <View style={styles.row}>
                    <Icon
                      name="heart"
                      size={24}
                      color={colors.primary}
                      style={{ marginRight: spacing.md }}
                    />
                    <View>
                      <Text style={typography.body}>Log Mood</Text>
                      <Text style={typography.caption}>Track your emotional state</Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </CardWrapper>
            </AnimatedPressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).springify().damping(20)}>
            <AnimatedPressable
              scaleTo={animationTokens.micro.cardPressScale}
              style={[styles.card, { marginBottom: spacing.md }]}
              onPress={() => router.push('/forum')}
            >
              <CardWrapper>
                <View style={styles.spaceBetween}>
                  <View style={styles.row}>
                    <Icon
                      name="chatbubbles"
                      size={24}
                      color={colors.warning}
                      style={{ marginRight: spacing.md }}
                    />
                    <View>
                      <Text style={typography.body}>Community Forum</Text>
                      <Text style={typography.caption}>Connect with others</Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </CardWrapper>
            </AnimatedPressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).springify().damping(20)}>
            <AnimatedPressable
              scaleTo={animationTokens.micro.cardPressScale}
              style={[styles.card, { marginBottom: spacing.md }]}
              onPress={() => router.push('/(tabs)/mindfulness')}
            >
              <CardWrapper>
                <View style={styles.spaceBetween}>
                  <View style={styles.row}>
                    <Icon
                      name="leaf"
                      size={24}
                      color={colors.success}
                      style={{ marginRight: spacing.md }}
                    />
                    <View>
                      <Text style={typography.body}>Mindfulness</Text>
                      <Text style={typography.caption}>Find your inner peace</Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </CardWrapper>
            </AnimatedPressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(440).springify().damping(20)}>
            <AnimatedPressable
              scaleTo={animationTokens.micro.cardPressScale}
              style={[styles.card, { marginBottom: spacing.md }]}
              onPress={() => router.push('/(tabs)/habits')}
            >
              <CardWrapper>
                <View style={styles.spaceBetween}>
                  <View style={styles.row}>
                    <Icon
                      name="checkmark-circle"
                      size={24}
                      color={colors.success}
                      style={{ marginRight: spacing.md }}
                    />
                    <View>
                      <Text style={typography.body}>Check Habits</Text>
                      <Text style={typography.caption}>Mark today&apos;s progress</Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </CardWrapper>
            </AnimatedPressable>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.delay(480).springify().damping(20)}
          style={[styles.card, { marginBottom: spacing.xxl }]}
        >
          <CardWrapper>
            <View style={{ alignItems: 'center' }}>
              <Icon
                name="medical"
                size={32}
                color={colors.danger}
                style={{ marginBottom: spacing.lg }}
              />
              <Text style={[typography.h3, { color: colors.danger, marginBottom: spacing.sm }]}>
                Need Immediate Help?
              </Text>
              <Text style={[typography.caption, { textAlign: 'center', marginBottom: spacing.lg }]}>
                If you&apos;re in crisis, don&apos;t hesitate to reach out for support
              </Text>
              <Button
                text="Emergency Support"
                onPress={handleEmergency}
                style={{ backgroundColor: colors.danger, width: '100%' }}
              />
            </View>
          </CardWrapper>
        </Animated.View>
      </ScrollView>

      {/* Emergency SOS Modal */}
      <Modal
        visible={isEmergencyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEmergencyModal}
      >
        <View style={styles.modalBackdrop} onTouchStart={closeEmergencyModal}>
          <View style={styles.modalContainer}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeEmergencyModal}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color={colors.textMuted} />
            </TouchableOpacity>

            {emergencyStep === 1 && (
              <Animated.View
                entering={FadeIn.duration(animationTokens.durations.normal)}
                exiting={FadeOut.duration(animationTokens.durations.fast)}
                style={styles.modalContent as any}
              >
                {/* Step 1: Selection View */}
                <Text style={[typography.h3, { marginBottom: spacing.sm, color: colors.text }]}>
                  Emergency Assistance
                </Text>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textMuted, marginBottom: spacing.xl, textAlign: 'center' },
                  ]}
                >
                  Who would you like to contact?
                </Text>

                {/* Option A: Authorities */}
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => handleEmergencyOptionPress({ title: 'Authorities', phone: '113' })}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionIconWrapper}>
                    <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
                  </View>
                  <View style={styles.optionTextWrapper}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                      Authorities
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      113 (Emergency Services)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Option B: Personal Emergency Contact */}
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() =>
                    handleEmergencyOptionPress({ title: 'Personal Contact', phone: '0123456789' })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.optionIconWrapper}>
                    <Ionicons name="person-outline" size={28} color={colors.success} />
                  </View>
                  <View style={styles.optionTextWrapper}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                      Personal Emergency Contact
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      0123456789
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </Animated.View>
            )}

            {emergencyStep === 2 && selectedTarget && (
              <Animated.View
                entering={FadeIn.duration(animationTokens.durations.normal)}
                exiting={FadeOut.duration(animationTokens.durations.fast)}
                style={styles.modalContent as any}
              >
                {/* Step 2: Swipe-to-Call & Location View */}
                <Text style={[typography.h3, { marginBottom: spacing.sm, color: colors.text }]}>
                  Confirm Call
                </Text>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textMuted, marginBottom: spacing.lg, textAlign: 'center' },
                  ]}
                >
                  Calling{' '}
                  <Text style={{ fontWeight: '600', color: colors.danger }}>
                    {selectedTarget.title}
                  </Text>
                </Text>

                {/* Location Display */}
                <View style={styles.locationCard}>
                  <Ionicons
                    name="location"
                    size={20}
                    color={locationFetched ? colors.success : colors.warning}
                    style={{ marginRight: spacing.sm }}
                  />
                  <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                    {currentLocation}
                  </Text>
                  {!locationFetched && <Ionicons name="refresh" size={20} color={colors.primary} />}
                </View>

                {/* Swipe to Call Button */}
                <View style={styles.swipeContainer}>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textMuted, marginBottom: spacing.md, textAlign: 'center' },
                    ]}
                  >
                    Swipe to Call
                  </Text>
                  <Animated.View
                    style={[styles.swipeTrack, swipeAnimatedStyle]}
                    {...(panResponder.panHandlers as any)}
                  >
                    <View style={styles.swipeThumb}>
                      <Ionicons name="call" size={28} color={colors.textInverse} />
                    </View>
                    <View style={styles.swipeLabel}>
                      <Text
                        style={[
                          typography.body,
                          { color: colors.textInverse, fontWeight: '600', letterSpacing: 2 },
                        ]}
                      >
                        SWIPE TO CALL
                      </Text>
                    </View>
                  </Animated.View>
                </View>
              </Animated.View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
