import { Alert, Platform } from 'react-native';

export class NotificationService {
  constructor() {
    // No-op by default; FCM setup removed to avoid hard dependency
  }

  public async getToken(): Promise<string | null> {
    // FCM integration is optional; return null when not configured
    return null;
  }

  // Request permission and show a system-level notification when possible.
  // Web: Uses the Web Notifications API (appears in notification bar if granted).
  // Native: Attempts to use react-native-push-notification if available; otherwise falls back to Alert.
  public async showSystemNotification(title: string, body: string) {
    if (Platform.OS === 'web') {
      try {
        const hasAPI = typeof (window as any).Notification !== 'undefined';
        if (!hasAPI) {
          // Fallback to alert when Notifications API is unavailable
          Alert.alert(title, body);
          return;
        }
        const permission = (window as any).Notification.permission;
        if (permission !== 'granted') {
          try { await (window as any).Notification.requestPermission(); } catch {}
        }
        if ((window as any).Notification.permission === 'granted') {
          try {
            // Display a lightweight system notification
            const n = new (window as any).Notification(title, {
              body,
              icon: undefined,
              vibrate: [200, 100, 200],
            });
            // Auto-close after a few seconds to reduce clutter
            setTimeout(() => { try { n.close(); } catch {} }, 5000);
          } catch (e) {
            // Fallback to Alert if creation fails
            Alert.alert(title, body);
          }
        } else {
          Alert.alert(title, body);
        }
      } catch (err) {
        Alert.alert(title, body);
      }
      return;
    }

    // Native (Android/iOS): Try dynamic import of push notification library
    try {
      const mod = await import('react-native-push-notification');
      const PushNotification = (mod as any).default || (mod as any);
      try {
        // Create (or ensure) a default channel on Android
        PushNotification.createChannel(
          {
            channelId: 'voodoo-default',
            channelName: 'VooDoo Notifications',
            channelDescription: 'General alerts',
            importance: 4,
            vibrate: true,
          },
          () => {}
        );
      } catch {}

      try {
        PushNotification.localNotification({
          channelId: 'voodoo-default',
          title,
          message: body,
          vibrate: true,
          vibration: 500,
          playSound: true,
          soundName: 'default',
          priority: 'high',
          importance: 'high',
        });
        return;
      } catch (e) {
        // Fall through to Alert
      }
    } catch (e) {
      // Library not installed; fall back
    }

    // Fallback when no native library available
    Alert.alert(title, body);
  }

  // Initialize local notifications on native platforms if the library is available
  public async initLocalNotifications() {
    if (Platform.OS === 'web') return; // not needed
    try {
      const mod = await import('react-native-push-notification');
      const PushNotification = (mod as any).default || (mod as any);
      try {
        // Configure permissions and callbacks (minimal setup)
        PushNotification.configure({
          onRegister: function () {},
          onNotification: function () {},
          requestPermissions: true,
        });
      } catch {}
      try {
        PushNotification.createChannel(
          {
            channelId: 'voodoo-default',
            channelName: 'VooDoo Notifications',
            channelDescription: 'General alerts',
            importance: 4,
            vibrate: true,
          },
          () => {}
        );
      } catch {}
    } catch {
      // library not installed; ignore
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();
