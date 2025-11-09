import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/constatantsV';

class AdminService {
  private baseUrl = `${BASE_URL}/admin`;

  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}` };
  }

  async listUsers(search?: string) {
    const headers = await this.getAuthHeader();
    const params = search ? { search } : {};
    const { data } = await axios.get(`${this.baseUrl}/users`, { headers, params });
    return data.data as Array<any>;
  }

  async getUserRooms(userId: string) {
    const headers = await this.getAuthHeader();
    const { data } = await axios.get(`${this.baseUrl}/users/${userId}/rooms`, { headers });
    return data.data as Array<any>;
  }

  async getUserDevices(userId: string, roomId?: string) {
    const headers = await this.getAuthHeader();
    const params = roomId ? { roomId } : {};
    const { data } = await axios.get(`${this.baseUrl}/users/${userId}/devices`, { headers, params });
    return data.data as Array<any>;
  }

  async getStats() {
    const headers = await this.getAuthHeader();
    const { data } = await axios.get(`${this.baseUrl}/stats`, { headers });
    return data as any;
  }
}

export default new AdminService();
