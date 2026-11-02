import { useCallback, useEffect, useState } from 'react';
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

/**
 * Custom hook encapsulating dynamic notification logic.
 */
export const useNotificationLogic = () => {
  const [isReminderEnabled, setIsReminderEnabledState] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const { isLoaded, isSignedIn } = useAuth();

  const initializeNotificationChannel = useCallback(async () => {
    if (Platform.OS !== 'android' || !isSupported) return;

    try {
      await setNotificationChannelAsync('default', {
        name: 'Default',
        description: 'Default channel for mood reminders and notifications',
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
        lockscreenVisibility: 1,
        bypassDnd: false,
      });
      console.log('[Notifications] Default channel initialized with MAX importance');
    } catch (error) {
      console.error('[Notifications] Failed to initialize notification channel:', error);
    }
  }, []);

  const persistSettings = useCallback(async (enabled: boolean) => {
    try {
      const settings: NotificationSettings = { enabled };
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('[Notifications] Failed to persist settings:', error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (stored) {
          const settings: NotificationSettings = JSON.parse(stored);
          if (mounted) {
            setIsReminderEnabledState(settings.enabled);
          }
        }
      } catch (error) {
        console.error('[Notifications] Failed to load settings:', error);
      }
    };

    const initialize = async () => {
      await loadSettings();

      if (!isLoaded || !isSignedIn) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        await initializeNotificationChannel();

        const permission = await getPermissionsAsync();
        const granted = permission.status === 'granted';

        if (mounted) setHasPermission(granted);

        if (!granted && permission.canAskAgain) {
          const requestResult = await requestPermissionsAsync();
          const nowGranted = requestResult.status === 'granted';

          if (mounted) {
            setHasPermission(nowGranted);
            if (!nowGranted) {
              setIsReminderEnabledState(false);
              await persistSettings(false);
            }
          }
        } else if (!granted && !permission.canAskAgain) {
          if (mounted) {
            setIsReminderEnabledState(false);
            await persistSettings(false);
          }
        }
      } catch (error) {
        console.error('[Notifications] Notification initialization failed:', error);
        if (mounted) setHasPermission(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn, initializeNotificationChannel, persistSettings]);

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

  return {
    isReminderEnabled,
    setIsReminderEnabled,
    isLoading,
    hasPermission,
    scheduleNextMoodNotification,
  };
};
