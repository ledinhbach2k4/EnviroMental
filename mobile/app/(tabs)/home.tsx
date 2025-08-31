import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
const moodColors = [colors.moodVerySad, colors.moodSad, colors.moodNeutral, colors.moodHappy, colors.moodVeryHappy];

const CardContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const AndroidCardContent = ({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) => (
  <View style={style}>{children}</View>
);

export default function Home() {
  const [greeting, setGreeting] = useState('');
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { getToken } = useAuth();

  useEffect(() => {
    console.log('Home screen useEffect started');
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }

    setQuickStats([
      { title: "Today's Mood", value: '😊', icon: 'happy', color: colors.moodHappy },
      { title: 'Habits Done', value: '3/5', icon: 'checkmark-circle', color: colors.success },
      { title: 'Meditation', value: '10 min', icon: 'leaf', color: colors.primary },
      { title: 'Sleep Score', value: '85%', icon: 'moon', color: colors.secondary },
    ]);

    const fetchTodayMood = async () => {
      if (!getToken) return;
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/moods`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const errorResponse = await res.json();
          throw new Error(errorResponse.detail || 'Failed to load mood data');
        }
        const entries = await res.json();
        if (entries.length > 0) {
          const latestMood = entries[entries.length - 1];
          setQuickStats((prevStats) =>
            prevStats.map((stat) =>
              stat.title === "Today's Mood"
                ? { ...stat, value: moodEmojis[latestMood.moodLevel], color: moodColors[latestMood.moodLevel] }
                : stat
            )
          );
        }
      } catch (error) {
        console.error(`Error fetching today's mood:`, error);
      }
    };

    fetchTodayMood();

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;

        const apiKey = Constants.expoConfig?.extra?.openWeatherApiKey;
        if (!apiKey) {
          setErrorMsg('Weather API key not configured');
          return;
        }

        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`
        );
        const data = await res.json();
        setWeather({
          temperature: Math.round(data.main.temp),
          description: data.weather[0].description,
          city: data.name,
        });
      } catch {
        setErrorMsg('Failed to fetch weather data');
      } finally {
        setLoadingWeather(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmergency = () => {
    alert('Emergency support activated. Help is on the way.');
  };

  const CardWrapper = Platform.OS === 'android' ? AndroidCardContent : CardContent;

  return (
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>{greeting}! 👋</Text>
          <Text style={textStyles.bodyLight}>How are you feeling today?</Text>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={[textStyles.h3, { marginBottom: 12 }]}>Current Weather</Text>
          <View style={[commonStyles.card, { flexDirection: 'row', alignItems: 'center', padding: 16 }]}>
            <CardWrapper>
              {loadingWeather ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : errorMsg ? (
                <Text style={[textStyles.body, { color: colors.danger }]}>{errorMsg}</Text>
              ) : weather ? (
                <>
                  <Icon name="cloud" size={32} color={colors.primary} style={{ marginRight: 12 }} />
                  <View>
                    <Text style={[textStyles.body, { fontWeight: 'bold' }]}>
                      {weather.city}: {weather.temperature}°C
                    </Text>
                    <Text style={textStyles.caption}>
                      {weather.description.charAt(0).toUpperCase() + weather.description.slice(1)}
                    </Text>
                  </View>
                </>
              ) : null}
            </CardWrapper>
          </View>
        </View>

        <View style={{ marginBottom: 30 }}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Today&apos;s Overview</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {quickStats.map((stat, i) => (
              <View
                key={i}
                style={[
                  commonStyles.cardSmall,
                  {
                    width: '48%',
                    alignItems: 'center',
                    borderColor: stat.color + '30',
                  },
                ]}>
                <CardWrapper>
                  <Icon name={stat.icon} size={24} color={stat.color} style={{ marginBottom: 8 }} />
                  <Text style={[textStyles.caption, { marginBottom: 4 }]}>{stat.title}</Text>
                  <Text style={[textStyles.h3, { color: stat.color, textAlign: 'center' }]}>{stat.value}</Text>
                </CardWrapper>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 30 }}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Quick Actions</Text>
          <TouchableOpacity
            style={[commonStyles.card, { marginBottom: 12 }]}
            onPress={() => router.push('/(tabs)/mood' as any)}>
            <CardWrapper>
              <View style={commonStyles.spaceBetween}>
                <View style={commonStyles.row}>
                  <Icon name="happy" size={24} color={colors.moodHappy} style={{ marginRight: 12 }} />
                  <View>
                    <Text style={textStyles.body}>Log Your Mood</Text>
                    <Text style={textStyles.caption}>Track how you&apos;re feeling</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </CardWrapper>
          </TouchableOpacity>

          <TouchableOpacity
            style={[commonStyles.card, { marginBottom: 12 }]}
            onPress={() => router.push('/(tabs)/mindfulness' as any)}>
            <CardWrapper>
              <View style={commonStyles.spaceBetween}>
                <View style={commonStyles.row}>
                  <Icon name="leaf" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                  <View>
                    <Text style={textStyles.body}>Start Meditation</Text>
                    <Text style={textStyles.caption}>Find your inner peace</Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </CardWrapper>
          </TouchableOpacity>

          <TouchableOpacity
            style={[commonStyles.card, { marginBottom: 12 }]}
            onPress={() => router.push('/(tabs)/habits' as any)}>
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

        <View
          style={[
            commonStyles.card,
            {
              borderColor: colors.danger + '30',
              marginBottom: 30,
            },
          ]}>
          <CardWrapper>
            <View style={{ alignItems: 'center' }}>
              <Icon name="medical" size={32} color={colors.danger} style={{ marginBottom: 12 }} />
              <Text style={[textStyles.h3, { color: colors.danger, marginBottom: 8 }]}>
                Need Immediate Help?
              </Text>
              <Text style={[textStyles.caption, { textAlign: 'center', marginBottom: 16 }]}>
                If you&apos;re in crisis, don&apos;t hesitate to reach out for support
              </Text>
              <Button
                text="Emergency Support"
                onPress={handleEmergency}
                style={{ backgroundColor: colors.danger, width: '100%' }}
              />
            </View>
          </CardWrapper>
        </View>
      </ScrollView>
    </View>
  );
}