import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/constatantsV';

class SubscriptionService {
  private baseUrl = `${BASE_URL}/subscriptions`;

  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getPlans() {
    const { data } = await axios.get(`${this.baseUrl}/plans`);
    return data.data as Array<{ id: string; name: string; price: number; currency: string; interval: string }>;
  }

  async listMy() {
    const headers = await this.getAuthHeader();
    const { data } = await axios.get(`${this.baseUrl}/`, { headers });
    return data.data as Array<any>;
  }

  async purchase(planId: string) {
    const headers = await this.getAuthHeader();
    const { data } = await axios.post(`${this.baseUrl}/purchase`, { plan: planId }, { headers });
    return data.data as any;
  }
}

export default new SubscriptionService();
