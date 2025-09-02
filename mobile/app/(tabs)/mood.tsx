import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, textStyles, colors } from '../../assets/styles/commonStyles';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { useAuth } from '@clerk/clerk-expo';
import { API_URL } from '../../constants/api';
import { useFocusEffect } from 'expo-router';

interface MoodEntry {
  id: string;
  moodLevel: number;
  note: string;
  createdAt: string;
  factors: string[];
}

const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
const moodLabels = ['Very Sad', 'Sad', 'Neutral', 'Happy', 'Very Happy'];
const moodColors = [colors.moodVerySad, colors.moodSad, colors.moodNeutral, colors.moodHappy, colors.moodVeryHappy];

const moodFactors = [
  'Weather', 'Sleep', 'Work', 'Exercise', 'Social', 'Food', 'Stress', 'Health'
];

export default function MoodTracker() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [moodNote, setMoodNote] = useState('');
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([]);
  const [todayLogged, setTodayLogged] = useState(false);
  const { getToken } = useAuth();

  const loadMoodData = async () => {
    if (!getToken) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/moods`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const entries = await res.json();
      setRecentEntries(entries.slice(-7)); // Last 7 entries

      // Check if today's mood is already logged
      const today = new Date().toDateString();
      const todayEntry = entries.find((entry: MoodEntry) =>
        new Date(entry.createdAt).toDateString() === today
      );
      setTodayLogged(!!todayEntry);
    } catch (error) {
      console.log('Error loading mood data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadMoodData();
    }, [getToken])
  );

  const saveMoodEntry = async () => {
    if (selectedMood === null) {
      Alert.alert('Please select a mood', 'Choose how you&apos;re feeling today');
      return;
    }

    const newEntry = {
      moodLevel: selectedMood,
      note: moodNote,
      factors: selectedFactors,
    };

    try {
      const token = await getToken();
      await fetch(`${API_URL}/moods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEntry),
      });

      Alert.alert('Mood Saved!', 'Your mood has been recorded for today');
      setSelectedMood(null);
      setSelectedFactors([]);
      setMoodNote('');
      loadMoodData();
    } catch (error) {
      console.log('Error saving mood:', error);
      Alert.alert('Error', 'Failed to save your mood entry');
    }
  };

  const toggleFactor = (factor: string) => {
    setSelectedFactors(prev =>
      prev.includes(factor)
        ? prev.filter(f => f !== factor)
        : [...prev, factor]
    );
  };

  const getAverageMood = () => {
    if (recentEntries.length === 0) return 0;
    const sum = recentEntries.reduce((acc, entry) => acc + entry.moodLevel, 0);
    return sum / recentEntries.length;
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>
            Mood Tracker 💭
          </Text>
          <Text style={textStyles.bodyLight}>
            How are you feeling today?
          </Text>
        </View>

        {/* Today's Mood Logging */}
        {!todayLogged && (
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <Text style={[textStyles.h3, { marginBottom: 20 }]}>Log Today&apos;s Mood</Text>

            {/* Mood Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[textStyles.body, { marginBottom: 12 }]}>How do you feel?</Text>
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between',
                marginBottom: 10 
              }}>
                {moodEmojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: selectedMood === index ? moodColors[index] + '30' : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: selectedMood === index ? 2 : 1,
                      borderColor: selectedMood === index ? moodColors[index] : colors.border,
                    }}
                    onPress={() => setSelectedMood(index)}
                  >
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedMood !== null && (
                <Text style={[textStyles.caption, { textAlign: 'center', color: moodColors[selectedMood] }]}>
                  {moodLabels[selectedMood]}
                </Text>
              )}
            </View>

            {/* Mood Factors */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[textStyles.body, { marginBottom: 12 }]}>What&apos;s affecting your mood?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {moodFactors.map((factor) => (
                  <TouchableOpacity
                    key={factor}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: selectedFactors.includes(factor) ? colors.primary + '20' : colors.border,
                      borderWidth: 1,
                      borderColor: selectedFactors.includes(factor) ? colors.primary : colors.border,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                    onPress={() => toggleFactor(factor)}
                  >
                    <Text style={{
                      color: selectedFactors.includes(factor) ? colors.primary : colors.textLight,
                      fontSize: 14,
                    }}>
                      {factor}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              text="Save Mood"
              onPress={saveMoodEntry}
              style={{ backgroundColor: colors.primary }}
            />
          </View>
        )}

        {/* Mood Insights */}
        {recentEntries.length > 0 && (
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Your Mood Insights</Text>

            <View style={[commonStyles.cardSmall, { backgroundColor: colors.primary + '10' }]}>
              <View style={commonStyles.spaceBetween}>
                <Text style={textStyles.body}>Average Mood (7 days)</Text>
                <View style={commonStyles.row}>
                  <Text style={[textStyles.h3, { color: colors.primary, marginRight: 8 }]}>
                    {moodEmojis[Math.round(getAverageMood())]}
                  </Text>
                  <Text style={[textStyles.body, { color: colors.primary }]}>
                    {moodLabels[Math.round(getAverageMood())]}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Recent Entries</Text>
            {recentEntries.slice().reverse().map((entry) => (
              <View key={entry.id} style={[commonStyles.cardSmall, { marginBottom: 8 }]}>
                <View style={commonStyles.spaceBetween}>
                  <View>
                    <View style={[commonStyles.row, { marginBottom: 4 }]}>
                      <Text style={{ fontSize: 20, marginRight: 8 }}>
                        {moodEmojis[entry.moodLevel]}
                      </Text>
                      <Text style={textStyles.body}>
                        {moodLabels[entry.moodLevel]}
                      </Text>
                    </View>
                    <Text style={textStyles.caption}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </Text>
                    {entry.factors && entry.factors.length > 0 && (
                      <Text style={[textStyles.caption, { marginTop: 4 }]}>
                        Factors: {entry.factors.join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tips */}
        <LinearGradient
          colors={[colors.primary + '20', colors.secondary + '20']}
          style={[commonStyles.card, { marginBottom: 30 }]}
        >
          <Icon name="bulb" size={24} style={{ color: colors.primary, marginBottom: 8 }} />
          <Text style={[textStyles.h3, { marginBottom: 8 }]}>Mood Tip</Text>
          <Text style={textStyles.body}>
            Regular mood tracking helps you identify patterns and triggers. 
            Try to log your mood at the same time each day for better insights.
          </Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}
