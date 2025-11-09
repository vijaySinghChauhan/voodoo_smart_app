const Subscription = require('../models/Subscription');

// Return available plans
exports.getPlans = async (req, res) => {
  const plans = [
    { id: 'monthly_99', name: 'Monthly', price: 99.0, currency: 'INR', interval: 'month' },
    { id: 'annual_999', name: 'Annual', price: 999.0, currency: 'INR', interval: 'year' }
  ];
  res.json({ success: true, data: plans });
};

// List current user's subscriptions
exports.listMySubscriptions = async (req, res) => {
  try {
    const list = await Subscription.listByUser(req.user.id);
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    console.error('List subscriptions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Purchase a subscription (simple server-side record)
exports.purchase = async (req, res) => {
  try {
    const plan = req.body.plan || 'monthly_99';
    const price = plan === 'annual_999' ? 999.0 : 99.0;
    const startDate = new Date();
    // compute end date based on plan
    const endDate = new Date(startDate);
    if (plan === 'annual_999') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    const sub = await Subscription.create({ userId: req.user.id, plan, price, status: 'active', startDate, endDate, autoRenew: true });
    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    console.error('Purchase subscription error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

