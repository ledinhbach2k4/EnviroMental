import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, KeyboardAvoidingView, Platform, ScrollView, Keyboard, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { ENV } from '../../constants/api';
import { useColors, useTypography, useSpacing, useRadii, useShadows } from '@/src/design/hooks';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface ForumPost {
  id: string;
  title: string;
  message: string;
  author: { name: string; color: string };
  replyCount: number;
  createdAt: Date;
  hasImage: boolean;
  imageUrl?: string;
}

const MOCK_POSTS: ForumPost[] = [
  {
    id: '1',
    title: 'How to manage anxiety during exams?',
    message: 'I have been feeling extremely anxious lately with my upcoming finals. Does anyone have tips on how to stay calm and focused? I tried meditation but my mind keeps wandering.',
    author: { name: 'Sarah M.', color: '#8641F4' },
    replyCount: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    hasImage: false,
  },
  {
    id: '2',
    title: 'Weekly check-in: How is everyone doing?',
    message: 'Just wanted to create a space for us to share how our week has been. Feel free to vent, celebrate wins, or just say hi! Remember, you are not alone.',
    author: { name: 'Community Bot', color: '#10B981' },
    replyCount: 47,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    hasImage: true,
    imageUrl: 'https://picsum.photos/seed/community/300/300',
  },
  {
    id: '3',
    title: 'Best apps for mood tracking?',
    message: 'Looking for recommendations on mood tracking apps that are simple and effective. Preferably free or with a generous free tier. What has worked for you?',
    author: { name: 'Alex K.', color: '#F59E0B' },
    replyCount: 8,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    hasImage: false,
  },
  {
    id: '4',
    title: 'Dealing with seasonal depression',
    message: 'As the days get shorter, I am noticing my mood dropping significantly. Has anyone found effective strategies for seasonal affective disorder? Light therapy? Supplements? Routine changes?',
    author: { name: 'Jordan P.', color: '#EF4444' },
    replyCount: 23,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    hasImage: true,
    imageUrl: 'https://picsum.photos/seed/sad/300/300',
  },
  {
    id: '5',
    title: 'Mindfulness exercise that changed my life',
    message: 'I wanted to share a simple 5-minute grounding exercise that has helped me tremendously during panic attacks. It is the 5-4-3-2-1 technique: identify 5 things you see, 4 things you can touch, 3 things you hear, 2 things you can smell, 1 thing you can taste.',
    author: { name: 'MindfulMike', color: '#8641F4' },
    replyCount: 31,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    hasImage: false,
  },
];

const formatTimeAgo = (dateValue: Date | string | number): string => {
  const date = new Date(dateValue);

  // Failsafe for invalid dates
  if (isNaN(date.getTime())) return 'Unknown time';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function ForumScreen() {
  const colors = useColors();
  const typography = useTypography();
  const spacing = useSpacing();
  const radii = useRadii();
  const shadows = useShadows();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();

  const tokenRef = useRef(getToken);
  useEffect(() => {
    tokenRef.current = getToken;
  }, [getToken]);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

  const isMountedRef = useRef(true);

  const fetchPosts = useCallback(async () => {
    try {
      const token = await tokenRef.current();
      const res = await fetch(`${ENV.API_URL}/forum`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const sortedData = data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (isMountedRef.current) {
          setPosts(sortedData);
        }
      } else {
        const errText = await res.text();
        console.error(`Failed to fetch posts. Status ${res.status}: ${errText}`);
      }
    } catch (error) {
      console.error('Failed to fetch posts from database:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      fetchPosts();
      return () => {
        isMountedRef.current = false;
      };
    }, [fetchPosts])
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      color: colors.textMuted,
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      color: colors.text,
    },
    newPostButton: {
      backgroundColor: colors.primary,
      borderRadius: radii.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      ...shadows.sm,
    },
    newPostButtonText: {
      color: colors.textInverse,
      fontWeight: '600',
      ...typography.body,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingBottom: spacing.xxxl,
    },
    postCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
      flexDirection: 'row',
      gap: spacing.md,
    },
    postLeft: {
      flex: 1,
      minWidth: 0,
    },
    postTitle: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    postAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    postAuthorName: {
      ...typography.caption,
      fontWeight: '600',
    },
    postPreview: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      lineHeight: 20,
    },
    postMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    postThumbnail: {
      width: 60,
      height: 60,
      borderRadius: radii.md,
      backgroundColor: colors.border,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: '90%',
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalClose: {
      padding: spacing.xs,
    },
    modalTitle: {
      ...typography.h3,
      color: colors.text,
      flex: 1,
      textAlign: 'center',
      marginHorizontal: spacing.md,
    },
    modalBody: {
      flex: 1,
      padding: spacing.lg,
    },
    inputLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.xs,
      marginLeft: spacing.xs,
    },
    titleInput: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      backgroundColor: colors.background,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
      minHeight: 50,
      ...typography.h3,
    },
    messageInput: {
      backgroundColor: colors.background,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 120,
      textAlignVertical: 'top',
      ...typography.body,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    mediaSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    mediaLabel: {
      ...typography.body,
      color: colors.text,
    },
    imageButton: {
      width: 56,
      height: 56,
      borderRadius: radii.md,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.primary,
    },
    modalFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: spacing.md + insets.bottom,
    },
    emojiButton: {
      padding: spacing.md,
    },
    postButton: {
      backgroundColor: colors.primary,
      borderRadius: radii.full,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      ...shadows.sm,
    },
    postButtonText: {
      color: colors.textInverse,
      fontWeight: '600',
      ...typography.body,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyIcon: {
      marginBottom: spacing.lg,
      opacity: 0.5,
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptyText: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
    imagePreview: {
      width: 52,
      height: 52,
      borderRadius: radii.md,
    },
    viewModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    viewModalContainer: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    viewModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    viewDeleteButton: {
      padding: spacing.xs,
    },
    viewModalBody: {
      padding: spacing.lg,
    },
    viewPostTitle: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    viewPostAuthor: {
      ...typography.caption,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    viewPostTime: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.md,
    },
    viewPostMessage: {
      ...typography.body,
      color: colors.text,
      lineHeight: 22,
      marginBottom: spacing.lg,
    },
    viewPostImage: {
      width: '100%',
      height: 250,
      borderRadius: radii.md,
      backgroundColor: colors.border,
    },
  }), [colors, typography, spacing, radii, shadows, insets]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const handleSubmitPost = async () => {
    if (!titleInput.trim() || !messageInput.trim()) return;

    const newPost: ForumPost = {
      id: Date.now().toString(),
      title: titleInput.trim(),
      message: messageInput.trim(),
      author: { name: 'You', color: colors.primary },
      replyCount: 0,
      createdAt: new Date(),
      hasImage: !!selectedImage,
      imageUrl: selectedImage || undefined,
    };

    // 1. Optimistic UI Update (Shows immediately)
    setPosts(prev => [newPost, ...prev]);
    setTitleInput('');
    setMessageInput('');
    setSelectedImage(null);
    setIsCreateModalVisible(false);
    Keyboard.dismiss();

    // 2. Background API Sync
    try {
      const token = await tokenRef.current();
      const res = await fetch(`${ENV.API_URL}/forum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newPost)
      });

      if (!res.ok) {
        // Server failed (e.g., 404 Not Found). Revert the optimistic UI update.
        setPosts(prev => prev.filter(p => p.id !== newPost.id));
        Alert.alert('Database Error', 'The backend API for forum posts is not ready yet (404 Not Found).');
      }
    } catch (error) {
      // Network failed completely
      setPosts(prev => prev.filter(p => p.id !== newPost.id));
      Alert.alert('Network Error', 'Failed to reach the server.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const token = await tokenRef.current();
      const res = await fetch(`${ENV.API_URL}/forum/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setSelectedPost(null);
        Alert.alert('Success', 'Post deleted.');
      } else {
        Alert.alert('Error', 'Failed to delete post.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Failed to reach the server.');
    }
  };

  const renderPostCard = ({ item }: { item: ForumPost }) => (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.8} onPress={() => setSelectedPost(item)}>
      <View style={styles.postLeft}>
        <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.postAuthorRow}>
          <Text style={[styles.postAuthorName, { color: item.author.color }]}>{item.author.name}</Text>
          <Text style={styles.postAuthorName}>·</Text>
          <Text style={styles.metaText}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.postPreview} numberOfLines={2}>{item.message}</Text>
        <View style={styles.postMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="chatbubble" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.replyCount}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={16} color={colors.textMuted} />
            <Text style={styles.metaText}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </View>
      {item.hasImage && item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.postThumbnail} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forum</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or create a post..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <TouchableOpacity style={styles.newPostButton} onPress={() => setIsCreateModalVisible(true)}>
          <Ionicons name="add" size={20} color={colors.textInverse} />
          <Text style={styles.newPostButtonText}>New Post</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPostCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles" size={64} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>Be the first to start a conversation!</Text>
          </View>
        }
      />

      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setTitleInput('');
          setMessageInput('');
          setIsCreateModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={insets.top}
        >
          <TouchableOpacity onPress={() => {
            Keyboard.dismiss();
            setTitleInput('');
            setMessageInput('');
            setIsCreateModalVisible(false);
          }} style={{ flex: 1 }}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.modalClose} onPress={() => {
                  Keyboard.dismiss();
                  setTitleInput('');
                  setMessageInput('');
                  setIsCreateModalVisible(false);
                }}>
                  <Ionicons name="close" size={28} color={colors.textMuted} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>New Post</Text>
                <View style={{ width: 44 }} />
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Text style={styles.inputLabel}>TITLE</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Title"
                  placeholderTextColor={colors.textMuted}
                  value={titleInput}
                  onChangeText={setTitleInput}
                  maxLength={100}
                  autoFocus
                />

                <Text style={styles.inputLabel}>MESSAGE</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Enter a message..."
                  placeholderTextColor={colors.textMuted}
                  value={messageInput}
                  onChangeText={setMessageInput}
                  multiline
                  maxLength={2000}
                />

                <View style={styles.mediaSection}>
                  <Text style={styles.mediaLabel}>Add Image (Optional)</Text>
                  <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                    {selectedImage ? (
                      <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                    ) : (
                      <Ionicons name="image-outline" size={28} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.emojiButton} onPress={() => setMessageInput(prev => prev + ' 😊')}>
                  <Ionicons name="happy-outline" size={28} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.postButton} onPress={handleSubmitPost} disabled={!titleInput.trim() || !messageInput.trim()}>
                  <Text style={[
                    styles.postButtonText,
                    { opacity: titleInput.trim() && messageInput.trim() ? 1 : 0.5 }
                  ]}>
                    Post
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!selectedPost}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedPost(null)}
      >
        <View style={styles.viewModalOverlay}>
          <View style={styles.viewModalContainer}>
            <View style={styles.viewModalHeader}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedPost(null)}>
                <Ionicons name="close" size={28} color={colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Post</Text>
              <TouchableOpacity
                style={styles.viewDeleteButton}
                onPress={() => {
                  if (selectedPost) {
                    handleDeletePost(selectedPost.id);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={24} color={colors.danger} />
              </TouchableOpacity>
            </View>

            {selectedPost && (
              <ScrollView style={styles.viewModalBody}>
                <Text style={styles.viewPostTitle}>{selectedPost.title}</Text>
                <Text style={[styles.viewPostAuthor, { color: selectedPost.author.color }]}>
                  {selectedPost.author.name}
                </Text>
                <Text style={styles.viewPostTime}>{formatTimeAgo(selectedPost.createdAt)}</Text>
                <Text style={styles.viewPostMessage}>{selectedPost.message}</Text>
                {selectedPost.hasImage && selectedPost.imageUrl && (
                  <Image source={{ uri: selectedPost.imageUrl }} style={styles.viewPostImage} resizeMode="cover" />
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}