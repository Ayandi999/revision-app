import AsyncStorage from "@react-native-async-storage/async-storage";
import { lt } from "drizzle-orm";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { db } from "@/database/db";
import { questions } from "@/database/schema";
import type { RevisionCache } from "@/functions/revisionQuestionFetch";

// ─── Constants ───────────────────────────────────────────────────────────────

const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";
const NOTIFICATION_CHANNEL_ID = "revision-reminders";
export const MORNING_REMINDER_ID = "morning-revision-reminder";
export const EVENING_REMINDER_ID = "evening-revision-reminder";

const REVISION_DATA_KEY = "revision-data";

// ─── Notification Handler Configuration ──────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(timestampMs: number): boolean {
  const cached = new Date(timestampMs);
  const now = new Date();
  return (
    cached.getFullYear() === now.getFullYear() &&
    cached.getMonth() === now.getMonth() &&
    cached.getDate() === now.getDate()
  );
}

function tomorrowMidnight(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Checks whether today's revision test is completed or if there are no questions due.
 */
export async function checkRevisionStatus(): Promise<{
  isCompleted: boolean;
  dueCount: number;
}> {
  try {
    // 1. Check AsyncStorage cached session for today
    const raw = await AsyncStorage.getItem(REVISION_DATA_KEY);
    if (raw) {
      const cache = JSON.parse(raw) as RevisionCache;
      if (isToday(cache.cachedAt)) {
        if (cache.status === "completed") {
          return { isCompleted: true, dueCount: 0 };
        }
        if (Array.isArray(cache.questions)) {
          return {
            isCompleted: false,
            dueCount: cache.questions.length,
          };
        }
      }
    }

    // 2. Query SQLite for questions due on or before today
    const dueQuestions = await db
      .select({ id: questions.id })
      .from(questions)
      .where(lt(questions.nextRevisionDate, tomorrowMidnight()));

    return {
      isCompleted: false,
      dueCount: dueQuestions.length,
    };
  } catch (err) {
    console.warn("[notificationService] Error checking revision status:", err);
    return { isCompleted: false, dueCount: 0 };
  }
}

// ─── Core Service Methods ────────────────────────────────────────────────────

/**
 * Initializes notification channels and handlers on app startup.
 */
export async function initNotifications(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: "Daily Revision Reminders",
      description: "Alerts at 10:00 AM & 6:00 PM when daily revision is pending",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#14B8A6",
      sound: "default",
    });
  }

  // Sync scheduled reminders based on user preference and current test status
  await syncRevisionReminders();
}

/**
 * Checks and requests notification permissions from the OS.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch (err) {
    console.warn("[notificationService] Permission request failed:", err);
    return false;
  }
}

/**
 * Retrieves the user's notification preference (defaults to true).
 */
export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (val === null) return true; // Enabled by default
    return val === "true";
  } catch {
    return true;
  }
}

/**
 * Saves user's notification preference and updates scheduled alerts accordingly.
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
    if (enabled) {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        await syncRevisionReminders();
      }
    } else {
      await cancelAllRevisionReminders();
    }
  } catch (err) {
    console.error("[notificationService] Failed to set notifications enabled:", err);
  }
}

/**
 * Cancels all scheduled revision reminders.
 */
export async function cancelAllRevisionReminders(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(MORNING_REMINDER_ID);
    await Notifications.cancelScheduledNotificationAsync(EVENING_REMINDER_ID);
  } catch (err) {
    console.warn("[notificationService] Error cancelling reminders:", err);
  }
}

/**
 * Cancels today's evening reminder when the user completes their revision test.
 */
export async function onRevisionTestCompleted(): Promise<void> {
  try {
    // Dismiss any active/delivered notifications from the notification tray
    await Notifications.dismissAllNotificationsAsync();

    // Cancel remaining evening reminder for today
    await Notifications.cancelScheduledNotificationAsync(EVENING_REMINDER_ID);
  } catch (err) {
    console.warn("[notificationService] Error on test completed cleanup:", err);
  }
}

/**
 * Synchronizes scheduled notifications according to the policy:
 * - 10:00 AM Morning reminder: If revision is not completed.
 * - 6:00 PM (18:00) Evening reminder: If revision is still not completed.
 * - If revision is completed or 0 questions are due: does not schedule notifications.
 */
export async function syncRevisionReminders(): Promise<void> {
  try {
    const isEnabled = await getNotificationsEnabled();
    if (!isEnabled) {
      await cancelAllRevisionReminders();
      return;
    }

    const { isCompleted, dueCount } = await checkRevisionStatus();

    // If already completed or no questions due, clear reminders
    if (isCompleted || dueCount === 0) {
      await cancelAllRevisionReminders();
      return;
    }

    // Cancel existing reminders first to prevent duplicate registrations
    await cancelAllRevisionReminders();

    // 1. Schedule Morning Reminder at 10:00 AM daily
    await Notifications.scheduleNotificationAsync({
      identifier: MORNING_REMINDER_ID,
      content: {
        title: "⏰ Morning Revision Ready",
        body: `You have questions due for revision today. Take your test to keep your retention strong!`,
        data: { url: "/revision" },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 10,
        minute: 0,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });

    // 2. Schedule Evening Reminder at 6:00 PM (18:00) daily
    await Notifications.scheduleNotificationAsync({
      identifier: EVENING_REMINDER_ID,
      content: {
        title: "🎯 Revision Pending",
        body: `Your daily revision test is still waiting. Don't break your streak—review before the day ends!`,
        data: { url: "/revision" },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 18,
        minute: 0,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });
  } catch (err) {
    console.warn("[notificationService] Error syncing revision reminders:", err);
  }
}

/**
 * Fires an immediate sample notification for manual verification in Settings.
 */
export async function sendInstantTestNotification(): Promise<boolean> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Test Revision Alert",
        body: "Your notifications are working! You'll receive alerts at 10:00 AM & 6:00 PM when revision is due.",
        data: { url: "/revision" },
        sound: "default",
      },
      trigger: {
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });

    return true;
  } catch (err) {
    console.error("[notificationService] Error sending test notification:", err);
    return false;
  }
}
