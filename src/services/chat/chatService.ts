import axios from 'axios';
import { BASE_URL, OFFLINE_MODE } from '../../constants/constatantsV';
import authService from '../auth/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockMessagesByRoom } from '../mock/mockData';

class ChatService {
  private baseUrl = `${BASE_URL}/chat`;

  private async getAuthHeader() {
    const token = await authService.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    return { Authorization: `Bearer ${token}` };
  }

  async getMessages(roomId: string) {
    if (OFFLINE_MODE) {
      const key = `chat_offline_${roomId}`;
      const json = await AsyncStorage.getItem(key);
      const fallback = mockMessagesByRoom[roomId] || mockMessagesByRoom['general'] || [];
      return json ? JSON.parse(json) : fallback;
    }
    const headers = await this.getAuthHeader();
    const { data } = await axios.get(`${this.baseUrl}/${encodeURIComponent(roomId)}`, { headers });
    return data.data as Array<any>;
  }

  async sendMessage(roomId: string, text: string) {
    if (OFFLINE_MODE) {
      const key = `chat_offline_${roomId}`;
      const json = await AsyncStorage.getItem(key);
      const arr = json ? JSON.parse(json) : [];
      const payload = { id: String(Date.now()), text: String(text), sender: 'You', timestamp: new Date().toISOString() };
      arr.push(payload);
      await AsyncStorage.setItem(key, JSON.stringify(arr));
      return payload;
    }
    const headers = await this.getAuthHeader();
    const { data } = await axios.post(`${this.baseUrl}/${encodeURIComponent(roomId)}`, { text }, { headers });
    return data.data as any;
  }
}

export default new ChatService();
