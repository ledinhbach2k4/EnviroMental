import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { commonStyles, textStyles, colors, gradients } from '../../assets/styles/commonStyles';
import Icon from '../../components/Icon';
import Button from '../../components/Button';
import { router } from 'expo-router';
interface QuickStat {
  title: string;
  value: string;
  icon: string;
  color: string;
}

export default function Home() {
  const [greeting, setGreeting] = useState('');
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }

    // Mock data for quick stats
    setQuickStats([
      { title: "Today's Mood", value: '😊', icon: 'happy', color: colors.moodHappy },
      { title: 'Habits Done', value: '3/5', icon: 'checkmark-circle', color: colors.success },
      { title: 'Meditation', value: '10 min', icon: 'leaf', color: colors.primary },
      { title: 'Sleep Score', value: '85%', icon: 'moon', color: colors.secondary },
    ]);
  }, []);

  const handleEmergency = () => {
    console.log('Emergency button pressed');
    // In a real app, this would trigger emergency protocols
    alert('Emergency support activated. Help is on the way.');
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
        {/* Header with greeting */}
        <View style={{ marginTop: 20, marginBottom: 30 }}>
          <Text style={[textStyles.h1, { color: colors.primary }]}>
            {greeting}! 👋
          </Text>
          <Text style={textStyles.bodyLight}>
            How are you feeling today?
          </Text>
        </View>

        {/* Quick Stats Grid */}
        <View style={{ marginBottom: 30 }}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Today&apos;s Overview</Text>
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            justifyContent: 'space-between' 
          }}>
            {quickStats.map((stat, index) => (
              <View key={index} style={[
                commonStyles.cardSmall,
                { 
                  width: '48%', 
                  alignItems: 'center',
                  backgroundColor: stat.color + '15',
                  borderColor: stat.color + '30',
                }
              ]}>
                <Icon 
                  name={stat.icon as any} 
                  size={24} 
                  style={{ color: stat.color, marginBottom: 8 }} 
                />
                <Text style={[textStyles.caption, { marginBottom: 4 }]}>
                  {stat.title}
                </Text>
                <Text style={[textStyles.h3, { color: stat.color }]}>
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ marginBottom: 30 }}>
          <Text style={[textStyles.h3, { marginBottom: 16 }]}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={[commonStyles.card, { marginBottom: 12 }]}
            onPress={() => router.push('/(tabs)/mood' as any)}
          >
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon name="happy" size={24} style={{ color: colors.moodHappy, marginRight: 12 }} />
                <View>
                  <Text style={textStyles.body}>Log Your Mood</Text>
                  <Text style={textStyles.caption}>Track how you&apos;re feeling</Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={20} style={{ color: colors.textLight }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[commonStyles.card, { marginBottom: 12 }]}
            onPress={() => router.push('/(tabs)/mindfulness' as any)}
          >
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon name="leaf" size={24} style={{ color: colors.primary, marginRight: 12 }} />
                <View>
                  <Text style={textStyles.body}>Start Meditation</Text>
                  <Text style={textStyles.caption}>Find your inner peace</Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={20} style={{ color: colors.textLight }} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[commonStyles.card, { marginBottom: 12 }]}
            onPress={() => router.push('/(tabs)/habits' as any)}
          >
            <View style={commonStyles.spaceBetween}>
              <View style={commonStyles.row}>
                <Icon name="checkmark-circle" size={24} style={{ color: colors.success, marginRight: 12 }} />
                <View>
                  <Text style={textStyles.body}>Check Habits</Text>
                  <Text style={textStyles.caption}>Mark today&apos;s progress</Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={20} style={{ color: colors.textLight }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Emergency Support */}
        <View style={[commonStyles.card, { 
          backgroundColor: colors.danger + '10',
          borderColor: colors.danger + '30',
          marginBottom: 30 
        }]}>
          <View style={{ alignItems: 'center' }}>
            <Icon name="medical" size={32} style={{ color: colors.danger, marginBottom: 12 }} />
            <Text style={[textStyles.h3, { color: colors.danger, marginBottom: 8 }]}>
              Need Immediate Help?
            </Text>
            <Text style={[textStyles.caption, { textAlign: 'center', marginBottom: 16 }]}>
              If you&apos;re in crisis, don&apos;t hesitate to reach out for support
            </Text>
            <Button
              text="Emergency Support"
              onPress={handleEmergency}
              style={[{ backgroundColor: colors.danger, width: '100%' }]}
            />
          </View>
        </View>

        {/* Daily Inspiration */}
        <LinearGradient
          colors={gradients.calm}
          style={[commonStyles.card, { marginBottom: 30 }]}
        >
          <Text style={[textStyles.h3, { color: colors.backgroundAlt, marginBottom: 8 }]}>
            Daily Inspiration
          </Text>
          <Text style={[textStyles.body, { color: colors.backgroundAlt }]}>
            &quot;The present moment is the only time over which we have dominion.&quot; - Test
          </Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}