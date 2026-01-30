import axios from 'axios';
import * as constantsV from '../../constants/constatantsV';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PhonePePaymentSDK from 'react-native-phonepe-pg';

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
  private phonePeInitialized: boolean = false;

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

  async initPhonePeSDK(params: {
    environment: 'SANDBOX' | 'PRODUCTION';
    merchantId: string;
    flowId: string;
    enableLogging?: boolean;
  }): Promise<boolean> {
    try {
      const { environment, merchantId, flowId, enableLogging } = params;
      const ok = await PhonePePaymentSDK.init(environment, merchantId, flowId, !!enableLogging);
      this.phonePeInitialized = !!ok;
      return !!ok;
    } catch (error: any) {
      console.error('PhonePe SDK init failed:', error?.message || String(error));
      this.phonePeInitialized = false;
      return false;
    }
  }

  async startPhonePeTransaction(request: string, appSchema?: string | null): Promise<{ status?: string; error?: string }> {
    try {
      if (!this.phonePeInitialized) {
        console.warn('PhonePe SDK not initialized; call initPhonePeSDK first');
      }
      const resp = await PhonePePaymentSDK.startTransaction(request, appSchema || null);
      return { status: resp?.status, error: resp?.error };
    } catch (error: any) {
      console.error('PhonePe startTransaction error:', error?.message || String(error));
      return { status: 'FAILURE', error: error?.message || 'Unknown error' };
    }
  }

  async createPhonePeOrder(payload: {
    amount: number;
    currency?: string;
    callbackUrl?: string;
  }): Promise<{ orderId?: string; token?: string; merchantId?: string }> {
    try {
      const headers = await this.getAuthHeader();
      const res = await axios.post(`${this.baseUrl}/phonepe/order`, {
        amount: payload.amount,
        currency: payload.currency || 'INR',
        callbackUrl: payload.callbackUrl,
      }, { headers });
      return {
        orderId: res.data?.orderId,
        token: res.data?.token,
        merchantId: res.data?.merchantId,
      };
    } catch (error) {
      return { orderId: undefined, token: undefined, merchantId: undefined };
    }
  }

  async checkPhonePeOrderStatus(orderId: string): Promise<string | undefined> {
    try {
      const headers = await this.getAuthHeader();
      const res = await axios.get(`${this.baseUrl}/phonepe/order/${orderId}/status`, { headers });
      return res.data?.status || res.data?.orderStatus;
    } catch {
      return undefined;
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
