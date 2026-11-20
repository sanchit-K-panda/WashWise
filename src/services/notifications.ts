import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

// Default notification presentation handler
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPresentAlert: true,
    }),
  });
} catch {
  // Graceful fallback in environments where notification handler setup is mocked or uninitialized
}

/**
 * Requests system permissions for local notifications.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schedules local notifications 5 minutes before ends_at and at ends_at.
 * Stores notification IDs in secure store to allow cancellation.
 */
export async function scheduleWashNotifications(
  sessionId: string,
  machineLabel: string,
  endsAt: Date
): Promise<{ fiveMinNotificationId?: string; endNotificationId?: string }> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return {};

    const now = Date.now();
    const endMs = endsAt.getTime();
    const fiveMinMs = endMs - 5 * 60 * 1000;

    let fiveMinNotificationId: string | undefined;
    let endNotificationId: string | undefined;

    // 1. Five minutes before completion
    if (fiveMinMs > now) {
      fiveMinNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Wash finishing soon',
          body: `Machine ${machineLabel} has 5 minutes remaining.`,
          sound: true,
          data: { sessionId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fiveMinMs),
        },
      });
    }

    // 2. Exact completion time
    if (endMs > now) {
      endNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Wash cycle complete',
          body: `Machine ${machineLabel} is done. Please collect your laundry.`,
          sound: true,
          data: { sessionId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: endsAt,
        },
      });
    }

    const notificationIds = [fiveMinNotificationId, endNotificationId].filter(Boolean) as string[];
    if (notificationIds.length > 0) {
      await SecureStore.setItemAsync(`wash_notifs_${sessionId}`, JSON.stringify(notificationIds));
    }

    return { fiveMinNotificationId, endNotificationId };
  } catch {
    return {};
  }
}

/**
 * Triggers an immediate notification alert to caretakers when an issue report is filed.
 */
export async function sendCaretakerIssueAlert(
  machineLabel: string,
  description: string,
  blockId?: string
): Promise<string | undefined> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return undefined;

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `New Issue: Machine ${machineLabel}`,
        body: description,
        sound: true,
        data: {
          type: 'issue_report',
          machineLabel,
          blockId,
        },
      },
      trigger: null, // trigger immediately
    });
  } catch {
    return undefined;
  }
}

/**
 * Cancels all scheduled notifications for a given wash session.
 */
export async function cancelSessionNotifications(sessionId: string): Promise<void> {
  try {
    const raw = await SecureStore.getItemAsync(`wash_notifs_${sessionId}`);
    if (raw) {
      const ids = JSON.parse(raw) as string[];
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      await SecureStore.deleteItemAsync(`wash_notifs_${sessionId}`);
    }
  } catch {
    // Graceful no-op on teardown failure
  }
}
