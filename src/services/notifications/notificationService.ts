import { getMessaging, onMessage } from 'firebase/messaging';
import { messaging } from '../../firebase';
import { Alert } from 'react-native';

export class NotificationService {
  private messaging = messaging;

  constructor() {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    // Handle foreground messages
    onMessage(this.messaging, (payload) => {
      console.log('Message received:', payload);
      this.showNotification(payload);
    });
  }

  private showNotification(payload: any) {
    Alert.alert(
      payload.notification?.title || 'New Notification',
      payload.notification?.body || 'You have a new message',
      [
        { text: 'OK', onPress: () => console.log('OK Pressed') },
      ]
    );
  }

  public async getToken(): Promise<string | null> {
    try {
      const token = await getMessaging().getToken();
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();