// @desc    Get Razorpay Key ID
// @route   GET /voodoo/api/payments/key
// @access  Public (key id is safe to expose)
const axios = require('axios');

exports.getPaymentKey = async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_q6jv7paIUDvF6t';
    res.json({ success: true, keyId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createRazorpayOrder = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount < 200) {
      return res.status(400).json({ success: false, message: 'Amount below Razorpay minimum of ₹2' });
    }
    const currency = String(req.body.currency || 'INR').toUpperCase();
    if (currency !== 'INR') {
      return res.status(400).json({ success: false, message: 'Only INR currency supported for Razorpay' });
    }
    const planId = String(req.body.planId || req.body.subscriptionId || '');
    const purpose = String(req.body.purpose || '');
    const receipt = planId
      ? `sub_${planId}_${Date.now()}`
      : (purpose ? `ord_${purpose}_${Date.now()}` : `ord_${Date.now()}`);
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keyId || !keySecret) {
      return res.status(503).json({
        success: false,
        message: 'Razorpay backend not configured (missing RAZORPAY_KEY_SECRET). Please try PhonePe or contact admin.',
      });
    }
    const payload = {
      amount: Math.round(amount),
      currency,
      receipt,
      payment_capture: 1,
      notes: { type: planId ? 'subscription' : 'ecommerce', planId, purpose, userId: String((req.user && req.user.id) || '') }
    };
    const rpRes = await axios.post('https://api.razorpay.com/v1/orders', payload, {
      auth: { username: keyId, password: keySecret }
    });
    if (!rpRes?.data?.id) {
      return res.status(502).json({ success: false, message: 'Razorpay order not created' });
    }
    return res.json({ success: true, order: rpRes.data });
  } catch (error: any) {
    console.error('createRazorpayOrder err:', error?.response?.data || error?.message || error);
    const status = Number(error?.response?.status) || 500;
    const msg =
      error?.response?.data?.error?.description ||
      error?.response?.data?.message ||
      error?.message ||
      'Server error';
    return res.status(status).json({ success: false, message: msg });
  }
};
