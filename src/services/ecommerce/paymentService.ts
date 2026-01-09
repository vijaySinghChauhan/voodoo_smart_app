import axios from 'axios';
import * as constantsV from '../../constants/constatantsV';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PaymentService {
  [x: string]: any;
  private baseUrl: string = constantsV.BASE_URL + '/payments';

  async getRazorpayKey(): Promise<string> {
    const res = await axios.get(`${this.baseUrl}/key`);
    return res.data?.keyId || '';
  }

  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async createRazorpayOrder(payload: { amount: number; currency?: string; planId?: string }): Promise<{ orderId?: string }> {
    try {
      const headers = await this.getAuthHeader();
      const res = await axios.post(`${this.baseUrl}/razorpay/order`, {
        amount: payload.amount,
        currency: payload.currency || 'INR',
        planId: payload.planId || ''
      }, { headers });
      const id = res.data?.order?.id;
      return { orderId: id };
    } catch (err) {
      console.error('Create Razorpay order error:', err);
      return { orderId: undefined };
    }
  }

  async initiatePhonePePayment(payload: {
    amount: number;
    currency?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    orderId?: string;
    callbackUrl?: string;
  }): Promise<{ redirectUrl?: string }> {
    try {
      const res = await axios.post(`${this.baseUrl}/phonepe/initiate`, {
        amount: payload.amount,
        currency: payload.currency || 'INR',
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail,
        orderId: payload.orderId,
        callbackUrl: payload.callbackUrl,
      });
      return { redirectUrl: res.data?.redirectUrl };
    } catch (err) {
      console.error('PhonePe initiate error:', err);
      return { redirectUrl: undefined };
    }
  }
}

export default new PaymentService();
