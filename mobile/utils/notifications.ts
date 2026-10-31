// Notification abstraction - works in both Expo Go and development builds
// Uses runtime detection + dynamic imports to avoid bundling expo-notifications in Expo Go

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Check if running in a development build (not Expo Go)
// expo-notifications is not available in Expo Go SDK 53+
export const isSupported = Constants.appOwnership !== 'expo' && Device.isDevice;

// Type definitions (duplicated to avoid importing expo-notifications at top level)
export type NotificationHandler = {
  handleNotification: (notification: any) => Promise<{
    shouldShowAlert: boolean;
    shouldPlaySound: boolean;
    shouldSetBadge: boolean;
    shouldShowBanner?: boolean;
    shouldShowList?: boolean;
  }>;
};

export type NotificationRequestInput = {
  content?: {
    title?: string;
    body?: string;
    data?: Record<string, any>;
    sound?: string | boolean;
    categoryIdentifier?: string;
    dismissible?: boolean; // Android: auto-dismiss when tapped
  };
  trigger?:
    | {
        type?: 'daily';
        hour?: number;
        minute?: number;
        repeats?: boolean;
        channelId?: string;
      }
    | {
        type?: 'timeInterval';
        seconds: number;
        repeats?: boolean;
        channelId?: string;
      }
    | {
        type?: 'date';
        date?: Date | number;
        timestamp?: number;
        channelId?: string;
      }
    | Record<string, any>
    | null;
  identifier?: string;
};

export type PermissionStatus = {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  expires: 'never' | string;
  granted: boolean;
};

export type NotificationChannelInput = {
  name: string;
  importance: number;
  description?: string;
  vibrationPattern?: number[];
  lightColor?: string;
  sound?: string;
  soundUrl?: string;
  enableVibrate?: boolean;
  enableLights?: boolean;
  lockscreenVisibility?: number;
  bypassDnd?: boolean;
  showBadge?: boolean;
  audioAttributes?: any;
};

export const AndroidImportance = {
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
};

let notificationsModule: any = null;

async function getNotificationsModule() {
  if (!isSupported) return null;
  if (!notificationsModule) {
    // Dynamic import - only loads expo-notifications when actually called
    // This code path is only reached when isSupported === true
    try {
      notificationsModule = await import('expo-notifications');
    } catch (err) {
      console.warn('[Notifications] Failed to load expo-notifications dynamically:', err);
      return null;
    }
  }
  return notificationsModule;
}

export const setNotificationHandler = async (handler: NotificationHandler) => {
  if (!isSupported) return;
  const Notifications = await getNotificationsModule();
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    try {
      Notifications.setNotificationHandler(handler);
    } catch (err) {
      console.warn('[Notifications] setNotificationHandler error:', err);
    }
  }
};

export const cancelAllScheduledNotificationsAsync = async () => {
  if (!isSupported) return;
  const Notifications = await getNotificationsModule();
  if (Notifications && typeof Notifications.cancelAllScheduledNotificationsAsync === 'function') {
    try {
      return await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (err) {
      console.warn('[Notifications] cancelAllScheduledNotificationsAsync error:', err);
    }
  }
};

export const scheduleNotificationAsync = async (request: NotificationRequestInput) => {
  if (!isSupported) return '';
  const Notifications = await getNotificationsModule();
  if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
    return '';
  }

  try {
    const rawTrigger: any = request.trigger;
    let normalizedTrigger: any = null;

    if (rawTrigger) {
      const channelId = rawTrigger.channelId || 'default';

      if (
        rawTrigger.type === 'daily' ||
        (rawTrigger.hour !== undefined && rawTrigger.minute !== undefined && !rawTrigger.type)
      ) {
        normalizedTrigger = {
          type: 'daily',
          hour: Number(rawTrigger.hour) || 0,
          minute: Number(rawTrigger.minute) || 0,
          channelId,
        };
      } else if (
        rawTrigger.type === 'timeInterval' ||
        (rawTrigger.seconds !== undefined && !rawTrigger.type)
      ) {
        normalizedTrigger = {
          type: 'timeInterval',
          seconds: Math.max(1, Math.floor(Number(rawTrigger.seconds) || 1)),
          repeats: Boolean(rawTrigger.repeats),
          channelId,
        };
      } else if (
        rawTrigger.type === 'date' ||
        rawTrigger.timestamp !== undefined ||
        rawTrigger.date !== undefined
      ) {
        let triggerDate: Date;
        if (rawTrigger.date instanceof Date) {
          triggerDate = rawTrigger.date;
        } else if (typeof rawTrigger.date === 'number') {
          triggerDate = new Date(
            rawTrigger.date > 10000000000 ? rawTrigger.date : rawTrigger.date * 1000
          );
        } else if (typeof rawTrigger.timestamp === 'number') {
          triggerDate = new Date(
            rawTrigger.timestamp > 10000000000 ? rawTrigger.timestamp : rawTrigger.timestamp * 1000
          );
        } else {
          triggerDate = new Date(Date.now() + 3000);
        }
        normalizedTrigger = {
          type: 'date',
          date: triggerDate,
          channelId,
        };
      } else {
        // Fallback: pass as is with guaranteed channelId
        normalizedTrigger = {
          ...rawTrigger,
          channelId,
        };
      }
    }

    const normalizedRequest = {
      ...request,
      trigger: normalizedTrigger,
    };

    return await Notifications.scheduleNotificationAsync(normalizedRequest);
  } catch (error) {
    console.error('[Notifications] scheduleNotificationAsync error:', error);
    return '';
  }
};

const DEFAULT_PERMISSION: PermissionStatus = {
  status: 'denied',
  canAskAgain: false,
  expires: 'never',
  granted: false,
};

export const getPermissionsAsync = async () => {
  if (!isSupported) return DEFAULT_PERMISSION;
  const Notifications = await getNotificationsModule();
  if (Notifications && typeof Notifications.getPermissionsAsync === 'function') {
    try {
      return await Notifications.getPermissionsAsync();
    } catch (err) {
      console.warn('[Notifications] getPermissionsAsync error:', err);
    }
  }
  return DEFAULT_PERMISSION;
};

export const requestPermissionsAsync = async () => {
  if (!isSupported) return DEFAULT_PERMISSION;
  const Notifications = await getNotificationsModule();
  if (Notifications && typeof Notifications.requestPermissionsAsync === 'function') {
    try {
      return await Notifications.requestPermissionsAsync();
    } catch (err) {
      console.warn('[Notifications] requestPermissionsAsync error:', err);
    }
  }
  return DEFAULT_PERMISSION;
};

export const setNotificationChannelAsync = async (
  channelId: string,
  channel: NotificationChannelInput
) => {
  if (!isSupported || Platform.OS !== 'android') return null;
  const Notifications = await getNotificationsModule();
  if (!Notifications || typeof Notifications.setNotificationChannelAsync !== 'function') {
    return null;
  }

  try {
    const safeChannel = {
      name: channel.name || 'Default',
      importance: channel.importance ?? AndroidImportance.MAX,
      description: channel.description || undefined,
      vibrationPattern: Array.isArray(channel.vibrationPattern)
        ? channel.vibrationPattern
        : [0, 250, 250, 250],
      lightColor: channel.lightColor || '#FF231F7C',
      sound: channel.sound || undefined,
      enableVibrate: channel.enableVibrate ?? true,
      enableLights: channel.enableLights ?? true,
      showBadge: channel.showBadge ?? true,
      lockscreenVisibility: channel.lockscreenVisibility ?? 1,
      bypassDnd: channel.bypassDnd ?? false,
    };

    return await Notifications.setNotificationChannelAsync(channelId || 'default', safeChannel);
  } catch (err) {
    console.warn('[Notifications] setNotificationChannelAsync error:', err);
    return null;
  }
};
