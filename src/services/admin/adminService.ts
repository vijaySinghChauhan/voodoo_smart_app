import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import configService from '../config/configService';

class AdminService {
  private async getBaseUrl() {
    return `${await configService.getBaseUrl()}/admin`;
  }

  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}` };
  }

  async listUsers(search?: string) {
    const headers = await this.getAuthHeader();
    const params = search ? { search } : {};
    const baseUrl = await this.getBaseUrl();
    const { data } = await axios.get(`${baseUrl}/users`, { headers, params });
    return data.data as Array<any>;
  }

  async getUserRooms(userId: string) {
    const headers = await this.getAuthHeader();
    const baseUrl = await this.getBaseUrl();
    const { data } = await axios.get(`${baseUrl}/users/${userId}/rooms`, { headers });
    return data.data as Array<any>;
  }

  async getUserDevices(userId: string, roomId?: string) {
    const headers = await this.getAuthHeader();
    const params = roomId ? { roomId } : {};
    const baseUrl = await this.getBaseUrl();
    const { data } = await axios.get(`${baseUrl}/users/${userId}/devices`, { headers, params });
    const items = (data?.data || []) as Array<any>;
    return items.map((d) => ({
      ...d,
      id: String(d.id ?? d._id ?? ''),
      subscriptionActive: typeof d.subscriptionActive !== 'undefined' ? Number(d.subscriptionActive) : (
        typeof d.subscription !== 'undefined' ? Number(d.subscription) : 0
      ),
      subscriptionEndDate: d.subscriptionEndDate ?? d.subscriptionEnd ?? d.subscription_last_date ?? null,
    }));
  }

  async getStats() {
    const headers = await this.getAuthHeader();
    const baseUrl = await this.getBaseUrl();
    const { data } = await axios.get(`${baseUrl}/stats`, { headers });
    return data as any;
  }
}

export default new AdminService();
