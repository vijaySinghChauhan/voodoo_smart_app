import axios from 'axios';
import * as constantsV from '../../constants/constatantsV';

class PaymentService {
  [x: string]: any;
  private baseUrl: string = constantsV.BASE_URL + '/payments';

  async getRazorpayKey(): Promise<string> {
    const res = await axios.get(`${this.baseUrl}/key`);
    return res.data?.keyId || '';
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