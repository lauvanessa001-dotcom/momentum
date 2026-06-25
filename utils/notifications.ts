import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const SETTINGS_KEY = "@momentum/notification_settings";
const NOTIFICATION_ID_KEY = "@momentum/notification_id";

export interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  hour: 9,
  minute: 0,
};

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_) {}
  return DEFAULT_SETTINGS;
}

export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch (_) {
    return false;
  }
}

export async function scheduleReminder(
  hour: number,
  minute: number,
): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    await cancelReminder();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Build your momentum today!",
        body: "Your habits are waiting — keep the streak alive.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    await AsyncStorage.setItem(NOTIFICATION_ID_KEY, id);
    return true;
  } catch (_) {
    return false;
  }
}

export async function cancelReminder(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const id = await AsyncStorage.getItem(NOTIFICATION_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(NOTIFICATION_ID_KEY);
    }
  } catch (_) {}
}

export function formatTime(hour: number, minute: string | number): string {
  const m = String(minute).padStart(2, "0");
  const ampm = hour < 12 ? "AM" : "PM";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}:${m} ${ampm}`;
}
