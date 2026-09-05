import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { isSupported, getPermissionsAsync, requestPermissionsAsync, setNotificationChannelAsync, AndroidImportance, scheduleNotificationAsync, cancelAllScheduledNotificationsAsync } from '@/utils/notifications';
import { useAuth } from '@clerk/expo';

const STORAGE_KEY = 'notification_reminder_settings';

interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

interface NotificationContextType {
  isReminderEnabled: boolean;
  setIsReminderEnabled: (enabled: boolean) => Promise<void>;
  notificationTime: { hour: number; minute: number };
  setNotificationTime: (hour: number, minute: number) => Promise<void>;
  isLoading: boolean;
  hasPermission: boolean;
  testNotification: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Initializes the Android notification channel with HIGH importance.
 * This is critical for notifications to appear on Android 8+ (API 26+).
 * Called on app launch regardless of permission state.
 */
const initializeNotificationChannel = async () => {
  if (Platform.OS !== 'android' || !isSupported) return;

  try {
    await setNotificationChannelAsync('default', {
      name: 'Default',
      description: 'Default channel for mood reminders and notifications',
      importance: AndroidImportance.MAX, // HIGH importance = shows as heads-up notification
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      lockscreenVisibility: 1, // VISIBILITY_PUBLIC
      bypassDnd: false,
    });
    console.log('[Notifications] Default channel initialized with MAX importance');
  } catch (error) {
    console.error('[Notifications] Failed to initialize notification channel:', error);
  }
};

/**
 * Schedules the daily recurring mood reminder notification.
 */
const scheduleDailyReminder = async (hour: number, minute: number) => {
  if (!isSupported) return;

  try {
    await cancelAllScheduledNotificationsAsync();
    const identifier = await scheduleNotificationAsync({
      content: {
        title: 'How are you feeling?',
        body: 'Time to log your mood for today!',
        data: { screen: 'mood' },
        categoryIdentifier: 'MOOD_REMINDER',
        sound: 'default',
        dismissible: true, // Auto-dismiss notification when tapped (Android)
      },
      trigger: {
        repeats: true,
        hour,
        minute,
      },
    });
    console.log('[Notifications] Daily reminder scheduled:', identifier);
  } catch (error) {
    console.error('[Notifications] Failed to schedule daily reminder:', error);
    throw error;
  }
};

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [isReminderEnabled, setIsReminderEnabledState] = useState<boolean>(true);
  const [notificationTime, setNotificationTimeState] = useState<{ hour: number; minute: number }>({ hour: 20, minute: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const { isLoaded, isSignedIn } = useAuth();

  // Load persisted settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (stored) {
          const settings: NotificationSettings = JSON.parse(stored);
          setIsReminderEnabledState(settings.enabled);
          setNotificationTimeState({ hour: settings.hour, minute: settings.minute });
        }
      } catch (error) {
        console.error('[Notifications] Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Initialize notification settings on app launch (after auth)
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!isLoaded || !isSignedIn) {
        setIsLoading(false);
        return;
      }

      try {
        // Initialize notification channel immediately (Android requirement)
        await initializeNotificationChannel();

        // Check current OS-level permission status
        const permission = await getPermissionsAsync();
        const granted = permission.status === 'granted';
        setHasPermission(granted);

        if (!granted && permission.canAskAgain) {
          // Request permission if not granted and user hasn't permanently denied
          const requestResult = await requestPermissionsAsync();
          const nowGranted = requestResult.status === 'granted';
          setHasPermission(nowGranted);

          // If user explicitly denies, auto-disable reminder
          if (!nowGranted) {
            setIsReminderEnabledState(false);
            await persistSettings(false);
          }
        } else if (!granted && !permission.canAskAgain) {
          // User permanently denied - disable reminder
          setIsReminderEnabledState(false);
          await persistSettings(false);
        }

        // Schedule reminder if enabled and permission granted
        if (isReminderEnabled && granted) {
          await scheduleDailyReminder(notificationTime.hour, notificationTime.minute);
        }
      } catch (error) {
        console.error('[Notifications] Failed to initialize notifications:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, [isLoaded, isSignedIn]);

  const persistSettings = async (enabled: boolean) => {
    try {
      const settings: NotificationSettings = {
        enabled,
        hour: notificationTime.hour,
        minute: notificationTime.minute,
      };
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('[Notifications] Failed to persist settings:', error);
    }
  };

  const setIsReminderEnabled = useCallback(async (enabled: boolean) => {
    setIsReminderEnabledState(enabled);

    if (enabled && !hasPermission) {
      // Request permission when enabling
      const permission = await requestPermissionsAsync();
      const granted = permission.status === 'granted';
      setHasPermission(granted);

      if (!granted) {
        setIsReminderEnabledState(false);
        await persistSettings(false);
        return;
      }
    }

    // Schedule or cancel based on new state
    if (enabled) {
      await scheduleDailyReminder(notificationTime.hour, notificationTime.minute);
    } else {
      await cancelAllScheduledNotificationsAsync();
    }

    await persistSettings(enabled);
  }, [hasPermission, notificationTime]);

  const setNotificationTime = useCallback(async (hour: number, minute: number) => {
    setNotificationTimeState({ hour, minute });

    // If reminder is enabled, reschedule with new time
    if (isReminderEnabled) {
      await scheduleDailyReminder(hour, minute);
    }

    // Persist new time
    try {
      const settings: NotificationSettings = {
        enabled: isReminderEnabled,
        hour,
        minute,
      };
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('[Notifications] Failed to persist time:', error);
    }
  }, [isReminderEnabled]);

  const testNotification = useCallback(async () => {
    if (!isSupported) {
      console.warn('[Notifications] Not supported in current environment (Expo Go?)');
      return;
    }

    try {
      // Ensure channel exists before scheduling (Android)
      if (Platform.OS === 'android') {
        await initializeNotificationChannel();
      }

      // Use a timestamp slightly in the future (current time + 3 seconds)
      // to avoid "invalid date" or "trigger time in past" errors on some devices
      const triggerTimestamp = Math.floor(Date.now() / 1000) + 3;

      await scheduleNotificationAsync({
        content: {
          title: 'Test: How are you feeling?',
          body: 'This is a test reminder!',
          data: { screen: 'mood' },
          categoryIdentifier: 'MOOD_REMINDER',
          sound: 'default',
          dismissible: true, // Auto-dismiss notification when tapped (Android)
        },
        trigger: {
          type: 'date',
          timestamp: triggerTimestamp,
        },
      });

      console.log('[Notifications] Test notification scheduled successfully');
    } catch (error) {
      // Detailed error logging to pinpoint exact failure source
      console.error('[Notifications] Failed to schedule test notification:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error ? error.cause : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      throw error; // Re-throw so UI can show alert
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      isReminderEnabled,
      setIsReminderEnabled,
      notificationTime,
      setNotificationTime,
      isLoading,
      hasPermission,
      testNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};