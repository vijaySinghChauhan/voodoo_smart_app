import axios from 'axios';
import * as constantsV from '../../constants/constatantsV';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Coupon {
  code: string;
  description?: string;
  discountType: 'percent' | 'flat';
  value: number;
  applicablePlanIds?: string[];
  expiresAt?: string;
}

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

  async getCoupons(): Promise<Coupon[]> {
    try {
      const res = await axios.get(`${this.baseUrl}/coupons`);
      const list = res.data?.data || res.data?.coupons || [];
      return list as Coupon[];
    } catch {
      return [
        { code: 'WELCOME10', description: '10% off', discountType: 'percent', value: 10 },
        { code: 'SAVE50', description: '₹50 off', discountType: 'flat', value: 50 },
      ];
    }
  }
}

export default new PaymentService();
