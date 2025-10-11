import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
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

const MAX_LOGS_PER_DAY = 6;
const LOG_INTERVAL_HOURS = 2;

export default function MoodTracker() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [moodNote, setMoodNote] = useState('');
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([]);
  const [todaysLogCount, setTodaysLogCount] = useState(0);
  const [lastLogTime, setLastLogTime] = useState<number | null>(null);
  const [timeToNextLog, setTimeToNextLog] = useState('');
  const [lastFetched, setLastFetched] = useState(0);
  const { getToken } = useAuth();

  const canLogNow = () => {
    if (todaysLogCount >= MAX_LOGS_PER_DAY) {
      return { canLog: false, reason: 'limit' };
    }
    if (lastLogTime) {
      const hoursSinceLastLog = (Date.now() - lastLogTime) / (1000 * 60 * 60);
      if (hoursSinceLastLog < LOG_INTERVAL_HOURS) {
        return { canLog: false, reason: 'time' };
      }
    }
    return { canLog: true, reason: null };
  };

  const updateTimeToNextLog = useCallback(() => {
    if (lastLogTime) {
      const nextLogTime = lastLogTime + LOG_INTERVAL_HOURS * 60 * 60 * 1000;
      const now = Date.now();
      if (now < nextLogTime) {
        const diffMinutes = Math.ceil((nextLogTime - now) / (1000 * 60));
        setTimeToNextLog(`You can log again in ${diffMinutes} minutes.`);
      } else {
        setTimeToNextLog('');
      }
    }
  }, [lastLogTime]);

  useEffect(() => {
    updateTimeToNextLog();
    const interval = setInterval(updateTimeToNextLog, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [updateTimeToNextLog]);

  const loadMoodData = useCallback(async (force = false) => {
    if (!getToken) return;

    const now = Date.now();
    if (!force && now - lastFetched < 30000) { // 30-second cache
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/moods`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`Failed to fetch mood data. Status: ${res.status}, Body: ${errorText}`);
        if (res.status !== 429) Alert.alert('Error', 'Could not load recent mood entries.');
        return;
      }

      const entries: MoodEntry[] = await res.json();
      // Sort entries by creation date, newest first
      const sortedEntries = entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRecentEntries(sortedEntries.slice(0, 7));

      const todayString = new Date().toDateString();
      const todaysEntries = sortedEntries.filter(entry => new Date(entry.createdAt).toDateString() === todayString);

      setTodaysLogCount(todaysEntries.length);

      if (todaysEntries.length > 0) {
        // The first entry in the sorted list is the most recent
        setLastLogTime(new Date(todaysEntries[0].createdAt).getTime());
      } else {
        setLastLogTime(null);
      }
      setLastFetched(now);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error("JSON Parse error:", error);
        Alert.alert('Error', 'Received malformed data from the server.');
      } else {
        console.log('Error loading mood data:', error);
        Alert.alert('Error', 'An unexpected error occurred.');
      }
    }
  }, [getToken, lastFetched]);

  useFocusEffect(useCallback(() => { loadMoodData(); }, [loadMoodData]));

  const saveMoodEntry = async () => {
    if (selectedMood === null) {
      Alert.alert('Please select a mood', 'Choose how you are feeling');
      return;
    }

    const newEntry = {
      moodLevel: selectedMood,
      note: moodNote,
      factors: selectedFactors,
    };

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/moods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEntry),
      });

      if (!res.ok) {
        const errorText = await res.text();
        Alert.alert('Error', `Failed to save mood: ${errorText}`);
        return;
      }

      Alert.alert('Mood Saved!', 'Your mood has been recorded.');
      setSelectedMood(null);
      setSelectedFactors([]);
      setMoodNote('');
      await loadMoodData(true);
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

  const { canLog, reason } = canLogNow();

  return (
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>
            Mood Tracker 💭
          </Text>
          <Text style={textStyles.bodyLight}>
            How are you feeling right now?
          </Text>
        </View>

        <View style={[commonStyles.card, { marginBottom: 30 }]}>
          <View style={commonStyles.spaceBetween}>
            <Text style={[textStyles.h3, { marginBottom: 20 }]}>Log Your Mood</Text>
            <Text style={[textStyles.body, { color: colors.textLight }]}>{todaysLogCount}/{MAX_LOGS_PER_DAY} logged today</Text>
          </View>

          {canLog ? (
            <>
              <View style={{ marginBottom: 20 }}>
                <Text style={[textStyles.body, { marginBottom: 12 }]}>How do you feel?</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  {moodEmojis.map((emoji, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        width: 60, height: 60, borderRadius: 30,
                        backgroundColor: selectedMood === index ? moodColors[index] + '30' : colors.border,
                        alignItems: 'center', justifyContent: 'center',
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

              <View style={{ marginBottom: 20 }}>
                <Text style={[textStyles.body, { marginBottom: 12 }]}>What's affecting your mood?</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {moodFactors.map((factor) => (
                    <TouchableOpacity
                      key={factor}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                        backgroundColor: selectedFactors.includes(factor) ? colors.primary + '20' : colors.border,
                        borderWidth: 1,
                        borderColor: selectedFactors.includes(factor) ? colors.primary : colors.border,
                        marginRight: 8, marginBottom: 8,
                      }}
                      onPress={() => toggleFactor(factor)}
                    >
                      <Text style={{ color: selectedFactors.includes(factor) ? colors.primary : colors.textLight, fontSize: 14 }}>
                        {factor}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button text="Save Mood" onPress={saveMoodEntry} style={{ backgroundColor: colors.primary }} />
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Icon name={reason === 'limit' ? 'checkmark-circle' : 'time'} size={40} color={colors.primary} style={{ marginBottom: 12 }} />
              <Text style={[textStyles.h3, { color: colors.primary, marginBottom: 4 }]}>
                {reason === 'limit' ? 'All Done for Today!' : 'A Little Break'}
              </Text>
              <Text style={textStyles.body}>
                {reason === 'limit'
                  ? `You've reached the maximum of ${MAX_LOGS_PER_DAY} logs for today.`
                  : timeToNextLog}
              </Text>
            </View>
          )}
        </View>

        {recentEntries.length > 0 && (
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Your Mood Insights</Text>
            <View style={[commonStyles.cardSmall, { backgroundColor: colors.primary + '10' }]}>
              <View style={commonStyles.spaceBetween}>
                <Text style={textStyles.body}>Average Mood (last 7 entries)</Text>
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

        {recentEntries.length > 0 && (
          <View style={[commonStyles.card, { marginBottom: 30 }]}>
            <Text style={[textStyles.h3, { marginBottom: 16 }]}>Recent Entries</Text>
            {recentEntries.map((entry) => (
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
                      {new Date(entry.createdAt).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

        <LinearGradient
          colors={[colors.primary + '20', colors.secondary + '20']}
          style={[commonStyles.card, { marginBottom: 30 }]}
        >
          <Icon name="bulb" size={24} color={colors.primary} style={{ marginBottom: 8 }} />
          <Text style={[textStyles.h3, { marginBottom: 8 }]}>Mood Tip</Text>
          <Text style={textStyles.body}>
            Logging your mood multiple times a day can provide deeper insights into how it fluctuates.
          </Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}
