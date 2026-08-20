// Notification abstraction - works in both Expo Go and development builds
// Uses runtime detection + dynamic imports to avoid bundling expo-notifications in Expo Go

import Constants from 'expo-constants';
import * as Device from 'expo-device';

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
  };
  trigger?: {
    repeats?: boolean;
    hour?: number;
    minute?: number;
    type?: string;
  };
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
  vibrationPattern?: number[];
  lightColor?: string;
  sound?: string;
  enableVibrate?: boolean;
  enableLights?: boolean;
  lockscreenVisibility?: number;
  bypassDnd?: boolean;
  showBadge?: boolean;
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
    notificationsModule = await import('expo-notifications');
  }
  return notificationsModule;
}

export const setNotificationHandler = async (handler: NotificationHandler) => {
  if (!isSupported) return;
  const Notifications = await getNotificationsModule();
  if (Notifications) {
    Notifications.setNotificationHandler(handler);
  }
};

export const cancelAllScheduledNotificationsAsync = async () => {
  if (!isSupported) return;
  const Notifications = await getNotificationsModule();
  if (Notifications) {
    return Notifications.cancelAllScheduledNotificationsAsync();
  }
};

export const scheduleNotificationAsync = async (request: NotificationRequestInput) => {
  if (!isSupported) return '';
  const Notifications = await getNotificationsModule();
  if (Notifications) {
    return Notifications.scheduleNotificationAsync(request);
  }
  return '';
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
  if (Notifications) {
    return Notifications.getPermissionsAsync();
  }
  return DEFAULT_PERMISSION;
};

export const requestPermissionsAsync = async () => {
  if (!isSupported) return DEFAULT_PERMISSION;
  const Notifications = await getNotificationsModule();
  if (Notifications) {
    return Notifications.requestPermissionsAsync();
  }
  return DEFAULT_PERMISSION;
};

export const setNotificationChannelAsync = async (
  channelId: string,
  channel: NotificationChannelInput
) => {
  if (!isSupported) return null;
  const Notifications = await getNotificationsModule();
  if (Notifications) {
    return Notifications.setNotificationChannelAsync(channelId, channel);
  }
  return null;
};