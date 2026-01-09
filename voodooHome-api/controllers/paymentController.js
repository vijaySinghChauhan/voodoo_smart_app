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
    const currency = String(req.body.currency || 'INR');
    const planId = String(req.body.planId || req.body.subscriptionId || '');
    if (!planId) {
      return res.status(400).json({ message: 'planId is required' });
    }
    const receipt = `sub_${planId}_${Date.now()}`;
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keyId || !keySecret) {
      const fakeOrderId = `order_${Date.now()}`;
      return res.json({ success: true, order: { id: fakeOrderId, amount, currency, receipt } });
    }
    const payload = {
      amount: Math.round(amount),
      currency,
      receipt,
      notes: { type: 'subscription', planId, userId: String(req.user.id) }
    };
    const rpRes = await axios.post('https://api.razorpay.com/v1/orders', payload, {
      auth: { username: keyId, password: keySecret }
    });
    return res.json({ success: true, order: rpRes.data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
