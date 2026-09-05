import { useCallback, useEffect, useState } from 'react';
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

/**
 * Custom hook encapsulating all notification logic.
 * Separates business logic from UI components.
 * Handles permission flow, scheduling, and state management.
 */
export const useNotificationLogic = () => {
  const [isReminderEnabled, setIsReminderEnabledState] = useState<boolean>(true);
  const [notificationTime, setNotificationTimeState] = useState<{ hour: number; minute: number }>({ hour: 20, minute: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const { isLoaded, isSignedIn } = useAuth();

  /**
   * Initializes the Android notification channel with HIGH importance.
   * This is critical for notifications to appear on Android 8+ (API 26+).
   */
  const initializeNotificationChannel = useCallback(async () => {
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
  }, []);

  /**
   * Schedules the daily recurring mood reminder notification.
   */
  const scheduleDailyReminder = useCallback(async (hour: number, minute: number) => {
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
  }, []);

  /**
   * Persist settings to SecureStore.
   */
  const persistSettings = useCallback(async (enabled: boolean, hour: number, minute: number) => {
    try {
      const settings: NotificationSettings = { enabled, hour, minute };
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('[Notifications] Failed to persist settings:', error);
    }
  }, []);

  /**
   * Initialize notifications on app launch.
   * Flow:
   * 1. Load persisted settings
   * 2. Check if user is authenticated and app is loaded
   * 3. Initialize notification channel (Android)
   * 4. Get current OS permission status
   * 5. If not granted and can ask again -> request permission
   * 6. If user denies -> auto-disable reminder (isReminderEnabled = false)
   * 7. If permanently denied -> auto-disable reminder
   * 8. If enabled and permission granted -> schedule daily reminder
   */
  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (stored) {
          const settings: NotificationSettings = JSON.parse(stored);
          if (mounted) {
            setIsReminderEnabledState(settings.enabled);
            setNotificationTimeState({ hour: settings.hour, minute: settings.minute });
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
        // Initialize notification channel immediately (Android requirement)
        await initializeNotificationChannel();

        const permission = await getPermissionsAsync();
        const granted = permission.status === 'granted';

        if (mounted) setHasPermission(granted);

        if (!granted && permission.canAskAgain) {
          // User hasn't decided yet - request permission
          const requestResult = await requestPermissionsAsync();
          const nowGranted = requestResult.status === 'granted';

          if (mounted) {
            setHasPermission(nowGranted);
            if (!nowGranted) {
              // User explicitly denied - auto opt-out
              setIsReminderEnabledState(false);
              await persistSettings(false, notificationTime.hour, notificationTime.minute);
            }
          }
        } else if (!granted && !permission.canAskAgain) {
          // User permanently denied (e.g., "Don't Ask Again")
          if (mounted) {
            setIsReminderEnabledState(false);
            await persistSettings(false, notificationTime.hour, notificationTime.minute);
          }
        }

        // Schedule reminder if enabled and permission granted
        if (mounted && isReminderEnabled && granted) {
          await scheduleDailyReminder(notificationTime.hour, notificationTime.minute);
        }
      } catch (error) {
        console.error('[Notifications] Notification initialization failed:', error);
        if (mounted) setHasPermission(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initialize();

    return () => { mounted = false; };
  }, [isLoaded, isSignedIn, initializeNotificationChannel, notificationTime, persistSettings]);

  /**
   * Toggle reminder on/off.
   * If enabling and no permission -> request permission.
   * If permission denied -> revert toggle to off.
   * Schedules or cancels daily reminder accordingly.
   * Persists state to SecureStore.
   */
  const setIsReminderEnabled = useCallback(async (enabled: boolean) => {
    setIsReminderEnabledState(enabled);

    if (enabled && !hasPermission) {
      const permission = await requestPermissionsAsync();
      const granted = permission.status === 'granted';
      setHasPermission(granted);

      if (!granted) {
        setIsReminderEnabledState(false);
        await persistSettings(false, notificationTime.hour, notificationTime.minute);
        return;
      }
    }

    // Schedule or cancel based on new state
    if (enabled) {
      await scheduleDailyReminder(notificationTime.hour, notificationTime.minute);
    } else {
      await cancelAllScheduledNotificationsAsync();
    }

    await persistSettings(enabled, notificationTime.hour, notificationTime.minute);
  }, [hasPermission, notificationTime, scheduleDailyReminder, persistSettings]);

  /**
   * Update notification time.
   * If reminder is enabled, reschedules with new time.
   * Persists new time to SecureStore.
   */
  const setNotificationTime = useCallback(async (hour: number, minute: number) => {
    setNotificationTimeState({ hour, minute });

    // If reminder is enabled, reschedule with new time
    if (isReminderEnabled) {
      await scheduleDailyReminder(hour, minute);
    }

    // Persist new time
    await persistSettings(isReminderEnabled, hour, minute);
  }, [isReminderEnabled, scheduleDailyReminder, persistSettings]);

  /**
   * Schedule a test notification that fires in 3 seconds.
   * Uses absolute timestamp to avoid "invalid date" errors on some devices.
   * Wrapped in try/catch with detailed error logging.
   */
  const sendTestNotification = useCallback(async () => {
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
  }, [initializeNotificationChannel]);

  return {
    isReminderEnabled,
    setIsReminderEnabled,
    notificationTime,
    setNotificationTime,
    isLoading,
    hasPermission,
    sendTestNotification,
  };
};