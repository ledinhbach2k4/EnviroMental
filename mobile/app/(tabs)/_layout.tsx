import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../../constants/api';
import {
  TouchableOpacity,
  View,
  Text,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import Modal from 'react-native-modal';
import axios from 'axios';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, commonStyles, chatStyles } from '@/assets/styles/commonStyles';
import { HabitsProvider } from '../../context/HabitsContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fullyRendered?: boolean;
}

// --- Typewriter Text Component ---
const TypewriterText = ({ text, onComplete, selectable }: { text: string; onComplete: () => void; selectable?: boolean }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText(''); // Reset when text prop changes
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(intervalId);
        if (onComplete) onComplete(); // Signal that typing is done
      }
    }, 30); // Adjust typing speed (ms per character)

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [text, onComplete]);

  return <Text selectable={selectable}>{displayedText}</Text>;
};

// --- Typing Indicator Component ---
const typingIndicatorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textLight,
    marginHorizontal: 3,
  },
});

const Dot = ({ delay }: { delay: number }) => {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1, // infinite loop
        true // reverse on repeat
      )
    );
  }, [delay, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[typingIndicatorStyles.dot, animatedStyle]} />;
};

const TypingIndicator = () => (
  <View style={typingIndicatorStyles.container}>
    <Dot delay={0} />
    <Dot delay={200} />
    <Dot delay={400} />
  </View>
);


// Draggable Chat Icon Component
const DraggableChatIcon = ({ onPress, insets }: { onPress: () => void; insets: EdgeInsets }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const BALLOON_SIZE = 56;
  const STARTING_RIGHT = 20;
  const STARTING_BOTTOM = 100;
  const PADDING = 10; // Padding from screen edges

  const tabBarHeight = (Platform.OS === 'ios' ? 70 : 60) + insets.bottom;
  const initialX = screenWidth - BALLOON_SIZE - STARTING_RIGHT;
  const initialY = screenHeight - BALLOON_SIZE - STARTING_BOTTOM - insets.bottom;

  const offsetX = useSharedValue(initialX);
  const offsetY = useSharedValue(initialY);
  const context = useSharedValue({ x: 0, y: 0 });

  const pan = Gesture.Pan()
    .onStart(() => { context.value = { x: offsetX.value, y: offsetY.value }; })
    .onUpdate(event => {
      let newX = context.value.x + event.translationX;
      let newY = context.value.y + event.translationY;
      const upperBoundY = insets.top + PADDING;
      const lowerBoundY = screenHeight - BALLOON_SIZE - tabBarHeight - PADDING;
      const leftBoundX = PADDING;
      const rightBoundX = screenWidth - BALLOON_SIZE - PADDING;
      newX = Math.max(leftBoundX, Math.min(newX, rightBoundX));
      newY = Math.max(upperBoundY, Math.min(newY, lowerBoundY));
      offsetX.value = newX;
      offsetY.value = newY;
    })
    .onEnd(() => {
      if (offsetX.value + BALLOON_SIZE / 2 > screenWidth / 2) {
        offsetX.value = withSpring(screenWidth - BALLOON_SIZE - PADDING);
      } else {
        offsetX.value = withSpring(PADDING);
      }
    });

  const tap = Gesture.Tap().onEnd(() => { runOnJS(onPress)(); });
  const composed = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[chatStyles.chatBalloon, { position: 'absolute', top: 0, left: 0, right: undefined, bottom: undefined }, animatedStyle]}>
        <FontAwesome5 name="robot" size={24} color={colors.primary} />
      </Animated.View>
    </GestureDetector>
  );
};


export default function TabLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href={"/(auth)/sign-in" as any} />;

  const openChat = () => setIsModalVisible(true);
  const closeChat = () => setIsModalVisible(false);

  const handleAnimationComplete = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, fullyRendered: true } : msg
      )
    );
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: input.trim(), fullyRendered: true };
    const typingMessage: Message = { id: `typing-${Date.now()}`, role: 'assistant', content: 'typing...' };
    
    setMessages(prev => [...prev, userMessage, typingMessage]);
    const messageToSend = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/chat`,
        { message: messageToSend },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 20000, }
      );

      const aiMessage: Message = { id: `ai-${Date.now()}`, role: 'assistant', content: res.data.message };
      setMessages(prev => [...prev.filter(m => m.content !== 'typing...'), aiMessage]);

    } catch (err: any) {
      const status = err?.response?.status;
      console.error('Chat error:', status, err?.response?.data || err?.message);
      let userMsg = 'Sorry, an error occurred.';
      if (status === 401 || status === 403) {
        userMsg = 'Authentication error. Please sign in again.';
      }
      const errorMessage: Message = { id: `err-${Date.now()}`, role: 'assistant', content: userMsg, fullyRendered: true };
      setMessages(prev => [...prev.filter(m => m.content !== 'typing...'), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <HabitsProvider>
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
            const icons: Record<string, string> = { home: 'home', mood: 'smile', habits: 'check-circle', profile: 'user', mindfulness: 'leaf' };
            return <FontAwesome5 name={icons[route.name] || 'question'} size={size} color={color} solid />;
          },
        })}
      >
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="mood" options={{ title: 'Mood' }} />
        <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
        <Tabs.Screen name="mindfulness" options={{ title: 'Mindfulness' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>

      <DraggableChatIcon onPress={openChat} insets={insets} />

      <Modal isVisible={isModalVisible} onBackdropPress={closeChat} onBackButtonPress={closeChat} style={chatStyles.modal}>
        <KeyboardAvoidingView behavior="padding" style={chatStyles.modalContent}>
          <View style={chatStyles.chatHeader}>
            <FontAwesome5 name="robot" size={20} color={colors.primary} />
            <Text style={chatStyles.chatTitle}>Chat with AI</Text>
            <TouchableOpacity onPress={closeChat}>
              <FontAwesome5 name="times" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              if (item.content === 'typing...') {
                return (
                  <View style={[chatStyles.messageBubble, chatStyles.aiMessage]}>
                    <TypingIndicator />
                  </View>
                );
              }

              const isAiMessage = item.role === 'assistant';
              const shouldAnimate = isAiMessage && !item.fullyRendered;

              return (
                <View
                  style={[
                    chatStyles.messageBubble,
                    item.role === 'user' ? chatStyles.userMessage : chatStyles.aiMessage,
                  ]}
                >
                  {shouldAnimate ? (
                    <TypewriterText
                      text={item.content}
                      onComplete={() => handleAnimationComplete(item.id)}
                      selectable={true}
                    />
                  ) : (
                    <Text selectable={isAiMessage}>{item.content}</Text>
                  )}
                </View>
              );
            }}
          />

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
    </HabitsProvider>
  );
}
