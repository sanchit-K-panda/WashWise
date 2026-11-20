import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import {
  requestNotificationPermissions,
  scheduleWashNotifications,
  cancelSessionNotifications,
} from '../notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('Notifications Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestNotificationPermissions', () => {
    it('returns true when permission is already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
    });

    it('requests permission if not already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      const result = await requestNotificationPermissions();
      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe('scheduleWashNotifications', () => {
    it('schedules 5-minute and completion notifications and saves IDs', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
      (Notifications.scheduleNotificationAsync as jest.Mock)
        .mockResolvedValueOnce('notif-5m-id')
        .mockResolvedValueOnce('notif-end-id');

      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes in future
      const result = await scheduleWashNotifications('session-1', '01', futureDate);

      expect(result.fiveMinNotificationId).toBe('notif-5m-id');
      expect(result.endNotificationId).toBe('notif-end-id');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'wash_notifs_session-1',
        JSON.stringify(['notif-5m-id', 'notif-end-id'])
      );
    });
  });

  describe('cancelSessionNotifications', () => {
    it('cancels scheduled notifications and cleans up storage', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(['notif-5m-id', 'notif-end-id'])
      );

      await cancelSessionNotifications('session-1');

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-5m-id');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-end-id');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('wash_notifs_session-1');
    });
  });
});
