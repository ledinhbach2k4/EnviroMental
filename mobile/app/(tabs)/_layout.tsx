import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  Text,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import Icon from '../../components/Icon';
import Modal from 'react-native-modal';
import axios from 'axios';
import { colors } from '../../assets/styles/commonStyles';

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
      const token = await getToken(); // Lấy JWT token từ Clerk

      const res = await axios.post(
        'http://192.168.1.3:5001/api/chat',
        { message: input.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const aiMessage = res.data;
      setMessages(prev => [...prev, { role: 'assistant', content: aiMessage.message }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Tabs */}
      <Tabs
        screenOptions={{
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
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        {/* Tabs list... */}
      </Tabs>

      {/* Chat Icon Button */}
      <TouchableOpacity
        style={[styles.chatBalloon, { bottom: insets.bottom + 80 }]}
        onPress={openChat}
      >
        <Icon name="chatbubbles" size={30} color={colors.primary} />
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={closeChat}
        onBackButtonPress={closeChat}
        style={styles.modal}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalContent}>
          <View style={styles.chatHeader}>
            <Icon name="chatbubbles" size={25} color={colors.primary} />
            <Text style={styles.chatTitle}>Tư vấn cùng AI</Text>
            <TouchableOpacity onPress={closeChat}>
              <Icon name="close" size={25} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Message list */}
          <FlatList
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <View
                style={{
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: item.role === 'user' ? '#dff0ff' : '#e9e9e9',
                  borderRadius: 10,
                  padding: 10,
                  marginVertical: 4,
                  maxWidth: '80%',
                }}
              >
                <Text>{item.content}</Text>
              </View>
            )}
          />

          {/* Input box */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
            <TextInput
              style={{
                flex: 1,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: 'white',
              }}
              placeholder="Nhập câu hỏi..."
              value={input}
              onChangeText={setInput}
              editable={!isLoading}
            />
            <TouchableOpacity onPress={sendMessage} disabled={isLoading || !input.trim()}>
              <Icon
                name="send"
                size={24}
                color={isLoading ? colors.textLight : colors.primary}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chatBalloon: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#F1F1F1',
    borderRadius: 50,
    padding: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3.5,
    zIndex: 9999,
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    height: '60%',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
});
