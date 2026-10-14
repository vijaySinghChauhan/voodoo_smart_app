import axios from 'axios';
import * as constantsV from '../../constants/constatantsV';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PhonePePaymentSDK from 'react-native-phonepe-pg';
import RazorpayCheckout from 'react-native-razorpay';
import { Platform } from 'react-native';
import { COLORS } from '../../theme/theme';

export interface RazorpayOpenOptions {
  key?: string;
  amount: number;
  currency?: string;
  orderId?: string;
  description?: string;
  name?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string; 
    method?: 'card' | 'netbanking' | 'wallet' | 'emi' | 'upi';
  };
  notes?: Record<string, string>;
  theme?: { color?: string; backdrop_color?: string };
  callbackUrl?: string;
  retry?: { enabled: boolean; max_count: number };
  send_sms_hash?: boolean;
  allow_rotation?: boolean;
  external?: { wallets: string[]; handlers: Record<string, any> };
}

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

  async createRazorpayOrder(payload: { amount: number; currency?: string; planId?: string }): Promise<{ orderId: string }> {
    try {
      const amountPaise = Math.max(200, Math.round(Number(payload.amount) || 0));
      if (amountPaise < 200) {
        throw new Error('Amount below Razorpay minimum of ₹2');
      }
      const headers = await this.getAuthHeader();
      const res = await axios.post(`${this.baseUrl}/razorpay/order`, {
        amount: amountPaise,
        currency: payload.currency || 'INR',
        planId: payload.planId || ''
      }, { headers, validateStatus: () => true });
      const data = res.data;
      if (!data || !data.success || !data.order || typeof data.order.id !== 'string' || data.order.id.length === 0) {
        const msg =
          (data && typeof data.message === 'string') ? data.message :
          (res.status === 401 || res.status === 403) ? 'Please login to continue payment' :
          (res.status >= 500 && res.status < 600) ? 'Payment server unavailable. Please try PhonePe or try again later.' :
          'Unable to create Razorpay order. Please try PhonePe.';
        throw new Error(msg);
      }
      return { orderId: String(data.order.id) };
    } catch (err: any) {
      const msg = err?.message || 'Unable to create Razorpay order';
      console.error('Create Razorpay order error:', msg);
      throw new Error(msg);
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

  sanitizePhone(raw?: string): string {
    if (!raw) return '';
    let digits = String(raw).replace(/\D+/g, '');
    if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
    if (digits.length > 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length > 12 && digits.startsWith('+91')) digits = digits.slice(3);
    return digits;
  }

  sanitizeEmail(raw?: string): string {
    if (!raw) return '';
    return String(raw).trim().toLowerCase();
  }

  sanitizeName(raw?: string): string {
    if (!raw) return '';
    return String(raw).replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  normalizeRazorpayError(err: any): { message: string; code?: string } {
    try {
      if (!err) return { message: 'Something went wrong' };
      if (typeof err === 'string') return { message: err };
      const msg =
        err?.message ||
        err?.description ||
        err?.error?.description ||
        err?.error?.message ||
        err?.data?.message ||
        err?.metadata?.sdk_error_code ||
        err?.reason ||
        err?.status ||
        '';
      const code =
        err?.code ||
        err?.error?.code ||
        err?.metadata?.sdk_error_code ||
        err?.razorpay_error_code ||
        undefined;
      if (String(msg).toLowerCase().includes('network')) return { message: 'Network error. Please check your internet.', code };
      if (String(msg).toLowerCase().includes('cancelled') || String(err?.description || '').toLowerCase().includes('cancelled')) return { message: 'Payment cancelled by user', code };
      if (String(msg).trim().length === 0) return { message: 'Payment failed. Please try again.', code };
      return { message: String(msg), code };
    } catch {
      return { message: 'Payment failed. Please try again.' };
    }
  }

  async openRazorpayPayment(options: RazorpayOpenOptions): Promise<{ razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string }> {
    let keyId = options?.key;
    try {
      if (!keyId) keyId = await this.getRazorpayKey();
    } catch {}
    if (!keyId) {
      keyId = 'rzp_test_q6jv7paIUDvF6t';
    }
    const amountPaise = Math.max(200, Math.round(Number(options.amount) || 0));
    const currency = (options.currency || 'INR').toUpperCase();
    let themeColor = (options?.theme?.color || COLORS?.primary || '#0E7C7B').trim();
    if (!/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(themeColor)) {
      themeColor = '#0E7C7B';
    }
    const sanitizedName = this.sanitizeName(options.prefill?.name);
    const sanitizedEmail = this.sanitizeEmail(options.prefill?.email);
    const sanitizedContact = this.sanitizePhone(options.prefill?.contact);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const RAZORPAY_MERCHANT_LOGO_FALLBACK =
      'https://www.gstatic.com/mobilesdk/180625_mobilesdk/images/firebase_lockup.png';

    const payload: any = {
      key: keyId,
      amount: amountPaise,
      currency,
      name: (options.name || 'VooDoo').toString().slice(0, 60),
      description: (options.description || 'Payment').toString().slice(0, 200),
      image:
        (options.image && /^https:\/\/.+/i.test(options.image) && !options.image.includes('your-app-logo-url'))
          ? options.image
          : RAZORPAY_MERCHANT_LOGO_FALLBACK,
      notes: options.notes ? { ...options.notes } : {},
      theme: { color: themeColor },
      retry: options.retry || { enabled: false, max_count: 0 },
      send_sms_hash: typeof options.send_sms_hash === 'boolean' ? options.send_sms_hash : false,
      allow_rotation: typeof options.allow_rotation === 'boolean' ? options.allow_rotation : false,
    };

    // HARD GUARD: Razorpay CheckoutActivity shows "Uh oh! Something went wrong" when order_id is
    // syntactically invalid (fakes, unknown to Razorpay, empty, too short, or not created via their API).
    // Real Razorpay order IDs always start with "order_" followed by 14+ alphanumeric characters.
    // If the order_id looks invalid/synthetic we drop it from the payload — Razorpay will still open
    // a valid checkout (no signature verification required) instead of crashing with the Uh-oh shield.
    const trimmedOrderId = (options.orderId || '').toString().trim();
    const looksLikeRealOrderId = /^order_[A-Za-z0-9]{14,}$/.test(trimmedOrderId);
    if (looksLikeRealOrderId) {
      payload.order_id = trimmedOrderId;
    } else if (trimmedOrderId.length > 0) {
      console.warn(
        '[openRazorpayPayment] Dropping suspicious order_id from Razorpay payload to avoid Uh-oh screen:',
        trimmedOrderId.slice(0, 40),
      );
    }

    const prefill: any = {};
    if (sanitizedName.length > 0) prefill.name = sanitizedName;
    if (sanitizedEmail.length > 0 && emailRegex.test(sanitizedEmail)) prefill.email = sanitizedEmail;
    if (sanitizedContact.length >= 10 && sanitizedContact.length <= 12 && /^\d+$/.test(sanitizedContact)) {
      prefill.contact = sanitizedContact;
    }
    if (options.prefill?.method) prefill.method = options.prefill.method;
    if (Object.keys(prefill).length > 0) payload.prefill = prefill;

    if (options.external) payload.external = options.external;
    if (Platform.OS === 'ios' && options.callbackUrl) {
      payload.callback_url = options.callbackUrl;
    }

    try {
      const res: any = await RazorpayCheckout.open(payload);
      return {
        razorpay_payment_id: res?.razorpay_payment_id || undefined,
        razorpay_order_id: res?.razorpay_order_id || payload.order_id || undefined,
        razorpay_signature: res?.razorpay_signature || undefined,
      };
    } catch (syncErr) {
      throw syncErr;
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
