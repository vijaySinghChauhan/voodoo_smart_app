// @desc    Get Razorpay Key ID
// @route   GET /voodoo/api/payments/key
// @access  Public (key id is safe to expose)
exports.getPaymentKey = async (req, res) => {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_q6jv7paIUDvF6t';
    res.json({ success: true, keyId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};