import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, OFFLINE_MODE } from '../../constants/constatantsV';
import { mockSubscriptions, mockSubscriptionPlans } from '../mock/mockData';

export interface Subscription {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  status: string;
}

class SubscriptionService {
  private baseUrl = `${BASE_URL}/subscriptions`;

  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getPlans() {
    if (OFFLINE_MODE) {
      return mockSubscriptionPlans as Array<{ id: string; name: string; price: number; currency: string; interval: string }>;
    }
    const { data } = await axios.get(`${this.baseUrl}/plans`);
    return data.data as Array<{ id: string; name: string; price: number; currency: string; interval: string }>;
  }

  async listMy() {
    if (OFFLINE_MODE) {
      return mockSubscriptions as unknown as Array<Subscription>;
    }
    const headers = await this.getAuthHeader();
    const { data } = await axios.get(`${this.baseUrl}/`, { headers });
    return data.data as Array<Subscription>;
  }

  async purchase(planId: string) {
    const headers = await this.getAuthHeader();
    const { data } = await axios.post(`${this.baseUrl}/purchase`, { plan: planId }, { headers });
    return data.data as any;
  }
}

export default new SubscriptionService();
