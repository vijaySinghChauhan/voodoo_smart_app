import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as constantsV from '../../constants/constatantsV';
import authService from '../auth/authService';

type LogEvent = {
  eventType: 'screen_view' | 'button_click' | string;
  screen?: string;
  action?: string;
  metadata?: Record<string, any> | null;
  timestamp?: string;
};

class LogService {
  private baseUrl: string = `${constantsV.BASE_URL}/logs`;

  private async getHeaders() {
    const token = (await authService.getToken()) || (await AsyncStorage.getItem('auth_token'));
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async log(event: LogEvent): Promise<void> {
    try {
      const headers = await this.getHeaders();
      const payload = {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      };
      await axios.post(this.baseUrl, payload, { headers, timeout: 10000 });
    } catch (err) {
      // Fail silently to avoid impacting UX
      console.log('logService: failed to log event', err?.message || String(err));
    }
  }

  async logScreenView(screen: string, metadata?: Record<string, any>): Promise<void> {
    return this.log({ eventType: 'screen_view', screen, metadata: metadata || null });
  }

  async logButtonClick(action: string, metadata?: Record<string, any>): Promise<void> {
    return this.log({ eventType: 'button_click', action, metadata: metadata || null });
  }
}

export default new LogService();
