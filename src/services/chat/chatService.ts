import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/constatantsV';

class ChatService {
  private baseUrl = `${BASE_URL}/chat`;

  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}` };
  }

  async getMessages(roomId: string) {
    const headers = await this.getAuthHeader();
    const { data } = await axios.get(`${this.baseUrl}/${encodeURIComponent(roomId)}`, { headers });
    return data.data as Array<any>;
  }

  async sendMessage(roomId: string, text: string) {
    const headers = await this.getAuthHeader();
    const { data } = await axios.post(`${this.baseUrl}/${encodeURIComponent(roomId)}`, { text }, { headers });
    return data.data as any;
  }
}

export default new ChatService();

