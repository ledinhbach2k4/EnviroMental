import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  isSupported,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  scheduleNextMoodNotification,
} from '@/utils/notifications';
import { useAuth } from '@clerk/expo';

const STORAGE_KEY = 'notification_reminder_settings';

interface NotificationSettings {
  enabled: boolean;
}

interface NotificationContextType {
  isReminderEnabled: boolean;
  setIsReminderEnabled: (enabled: boolean) => Promise<void>;
  isLoading: boolean;
  hasPermission: boolean;
  scheduleNextMoodNotification: (
    lastLogTime?: number | Date | null,
    todaysLogCount?: number
  ) => Promise<string>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Initializes the Android notification channel with HIGH importance.
 * Critical for notifications to appear on Android 8+ (API 26+).
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

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [isReminderEnabled, setIsReminderEnabledState] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const { isLoaded, isSignedIn } = useAuth();

  // Persist notification settings to SecureStore
  const persistSettings = useCallback(async (enabled: boolean) => {
    try {
      const settings: NotificationSettings = { enabled };
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('[Notifications] Failed to persist settings:', error);
    }
  }, []);

  // Load persisted settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (stored) {
          const settings: NotificationSettings = JSON.parse(stored);
          setIsReminderEnabledState(settings.enabled);
        }
      } catch (error) {
        console.error('[Notifications] Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Initialize notification channel and permissions on app launch (after auth)
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
          const requestResult = await requestPermissionsAsync();
          const nowGranted = requestResult.status === 'granted';
          setHasPermission(nowGranted);

          if (!nowGranted) {
            setIsReminderEnabledState(false);
            await persistSettings(false);
          }
        } else if (!granted && !permission.canAskAgain) {
          setIsReminderEnabledState(false);
          await persistSettings(false);
        }
      } catch (error) {
        console.error('[Notifications] Failed to initialize notifications:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, [isLoaded, isSignedIn, persistSettings]);

  const setIsReminderEnabled = useCallback(
    async (enabled: boolean) => {
      setIsReminderEnabledState(enabled);

      if (enabled && !hasPermission) {
        const permission = await requestPermissionsAsync();
        const granted = permission.status === 'granted';
        setHasPermission(granted);

        if (!granted) {
          setIsReminderEnabledState(false);
          await persistSettings(false);
          return;
        }
      }

      if (!enabled) {
        await cancelAllScheduledNotificationsAsync();
      }

      await persistSettings(enabled);
    },
    [hasPermission, persistSettings]
  );

  return (
    <NotificationContext.Provider
      value={{
        isReminderEnabled,
        setIsReminderEnabled,
        isLoading,
        hasPermission,
        scheduleNextMoodNotification,
      }}
    >
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
