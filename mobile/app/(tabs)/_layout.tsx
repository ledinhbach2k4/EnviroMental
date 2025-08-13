import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import Modal from 'react-native-modal';
import axios from 'axios';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, commonStyles, chatStyles } from '@/assets/styles/commonStyles';

export default function TabLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href={"/(auth)/sign-in" as any} />;

  const openChat = () => setIsModalVisible(true);
  const closeChat = () => setIsModalVisible(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = await getToken();
      const res = await axios.post(
        'http://192.168.1.3:5001/api/chat',
        { message: input.trim() },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const aiMessage = res.data;
      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage.message }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Tabs */}
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textLight,
          tabBarStyle: {
            backgroundColor: colors.backgroundAlt,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 20 : 10),
            paddingTop: 10,
            height: (Platform.OS === 'ios' ? 70 : 60) + (insets.bottom || 0),
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
          tabBarIcon: ({ color, size }) => {
            const icons: Record<string, string> = {
              home: 'home',
              mood: 'smile',
              habits: 'check-circle',
              profile: 'user',
              mindfulness: 'leaf',
            };
            const iconName = icons[route.name] || 'question';
            return <FontAwesome5 name={iconName as any} size={size} color={color} solid />;
          },
        })}
      >
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="mood" options={{ title: 'Mood' }} />
        <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
        <Tabs.Screen name="mindfulness" options={{ title: 'Mindfulness' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>

      {/* Chat Icon */}
      <TouchableOpacity
        style={[chatStyles.chatBalloon, { bottom: insets.bottom + 80 }]}
        onPress={openChat}
      >
        <FontAwesome5 name="robot" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={closeChat}
        onBackButtonPress={closeChat}
        style={chatStyles.modal}
      >
        <KeyboardAvoidingView behavior="padding" style={chatStyles.modalContent}>
          <View style={chatStyles.chatHeader}>
            <FontAwesome5 name="robot" size={20} color={colors.primary} />
            <Text style={chatStyles.chatTitle}>Consult with AI</Text>
            <TouchableOpacity onPress={closeChat}>
              <FontAwesome5 name="times" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Message list */}
          <FlatList
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <View
                style={[
                  chatStyles.messageBubble,
                  item.role === 'user' ? chatStyles.userMessage : chatStyles.aiMessage,
                ]}
              >
                <Text>{item.content}</Text>
              </View>
            )}
          />

          {/* Input */}
          <View style={chatStyles.inputRow}>
            <TextInput
              style={chatStyles.inputBox}
              placeholder="Enter your question..."
              value={input}
              onChangeText={setInput}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={sendMessage} disabled={isLoading || !input.trim()}>
              <FontAwesome5
                name="paper-plane"
                size={20}
                color={isLoading ? colors.textLight : colors.primary}
                style={chatStyles.sendIcon}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
