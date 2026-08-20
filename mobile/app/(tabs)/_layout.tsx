import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ENV } from '../../constants/api';
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
  Alert,
} from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import Modal from 'react-native-modal';
import axios from 'axios';
import { FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
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
import Markdown from 'react-native-markdown-display';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fullyRendered?: boolean;
}

const TypingIndicator = () => {
  const colors = useColors();
  const spacing = useSpacing();
  
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
    }}>
      <Dot delay={0} color={colors.textMuted} size={8} />
      <Dot delay={200} color={colors.textMuted} size={8} />
      <Dot delay={400} color={colors.textMuted} size={8} />
    </View>
  );
};

const Dot = ({ delay, color, size }: { delay: number; color: string; size: number }) => {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, [delay, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, marginHorizontal: 3 }, animatedStyle]} />;
};

// --- Typewriter Text Component ---
const TypewriterText = ({ text, onComplete, messageId, selectable, forceComplete }: { text: string; onComplete: (id: string) => void; messageId: string; selectable?: boolean; forceComplete?: boolean }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isComplete || forceComplete) return;
    
    setDisplayedText('');
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(intervalId);
        setIsComplete(true);
        if (onComplete) onComplete(messageId);
      }
    }, 30);

    return () => clearInterval(intervalId);
  }, [text, messageId, onComplete, forceComplete]);

  if (forceComplete || isComplete) {
    return <Markdown selectable={selectable}>{text}</Markdown>;
  }

  return <Text selectable={selectable}>{displayedText}</Text>;
};

// Draggable Chat Icon Component
const DraggableChatIcon = ({ onPress, insets }: { onPress: () => void; insets: EdgeInsets }) => {
  const colors = useColors();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const BALLOON_SIZE = 56;
  const STARTING_RIGHT = 20;
  const STARTING_BOTTOM = 100;
  const PADDING = 10;

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
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: undefined, bottom: undefined }, animatedStyle, {
        width: BALLOON_SIZE,
        height: BALLOON_SIZE,
        borderRadius: BALLOON_SIZE / 2,
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3.5,
        zIndex: 9999,
      }]}>
        <FontAwesome5 name="robot" size={24} color={colors.primary} />
      </Animated.View>
    </GestureDetector>
  );
};

export default function TabLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const initialMessageIdsRef = useRef<Set<string>>(new Set());
  const hasInitializedRef = useRef(false);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href={"/(auth)/sign-in" as any} />;

  // Track initial messages when modal opens to prevent typing animation replay
  useEffect(() => {
    if (isModalVisible && !hasInitializedRef.current) {
      initialMessageIdsRef.current = new Set(messages.map(m => m.id));
      hasInitializedRef.current = true;
    } else if (!isModalVisible) {
      hasInitializedRef.current = false;
    }
  }, [isModalVisible, messages]);

  const openChat = () => setIsModalVisible(true);
  const closeChat = () => setIsModalVisible(false);

  const handleAnimationComplete = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, fullyRendered: true } : msg
      )
    );
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Message copied to clipboard');
    } catch (err) {
      console.error('Copy failed:', err);
      Alert.alert('Error', 'Failed to copy message');
    }
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
        `${ENV.API_URL}/chat`,
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

  const chatStyles = useMemo(() => StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      padding: spacing.lg,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      height: '60%',
    },
    chatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    chatTitle: {
      ...typography.h3,
      color: colors.primary,
    },
    messageBubble: {
      borderRadius: radii.md,
      padding: spacing.sm,
      marginVertical: spacing.xs,
      maxWidth: '80%',
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primaryLight,
    },
    aiMessage: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    inputBox: {
      flex: 1,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.backgroundAlt,
    },
    sendIcon: {
      marginLeft: spacing.sm,
    },
  }), [colors, spacing, radii, typography]);

  const tabBarStyle = useMemo(() => ({
    backgroundColor: colors.backgroundAlt,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 20 : 10),
    paddingTop: spacing.sm,
    height: (Platform.OS === 'ios' ? 70 : 60) + (insets.bottom || 0),
    ...shadows.lg,
  }), [colors, spacing, shadows, insets]);

  return (
    <HabitsProvider>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: tabBarStyle,
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
              <FontAwesome5 name="times" size={20} color={colors.textMuted} />
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
              const isInitialMessage = initialMessageIdsRef.current.has(item.id);
              const shouldAnimate = isAiMessage && !item.fullyRendered && !isInitialMessage;

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
                      onComplete={handleAnimationComplete}
                      messageId={item.id}
                      selectable={true}
                    />
                  ) : (
                    <View>
                      {isAiMessage ? (
                        <Markdown selectable={true}>{item.content}</Markdown>
                      ) : (
                        <Text selectable={true}>{item.content}</Text>
                      )}
                      {isAiMessage && (
                        <TouchableOpacity
                          onPress={() => handleCopy(item.content)}
                          style={{ marginTop: 6, alignSelf: 'flex-end' }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
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
                color={isLoading ? colors.textMuted : colors.primary}
                style={chatStyles.sendIcon}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </HabitsProvider>
  );
}