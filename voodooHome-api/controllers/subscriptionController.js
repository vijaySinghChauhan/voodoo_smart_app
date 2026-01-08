const Subscription = require('../models/Subscription');
const { pool } = require('../config/db');

// Return available plans from catalog
exports.getPlans = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, code, name, price, currency, interval FROM subscription_plans WHERE is_active=1 ORDER BY price ASC'
    );
    const plans = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      price: Number(r.price),
      currency: r.currency || 'INR',
      interval: r.interval || 'month'
    }));
    res.json({ success: true, data: plans });
  } catch (err) {
    console.error('Get plans error:', err);
    res.status(500).json({ message: 'Server error' });
  }
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
    const planParam = req.body.plan;
    if (!planParam) return res.status(400).json({ message: 'plan is required' });
    // Fetch plan by numeric id or code
    let planRow = null;
    if (/^\d+$/.test(String(planParam))) {
      const [rows] = await pool.query('SELECT * FROM subscription_plans WHERE id=? AND is_active=1 LIMIT 1', [Number(planParam)]);
      planRow = rows[0] || null;
    } else {
      const [rows] = await pool.query('SELECT * FROM subscription_plans WHERE code=? AND is_active=1 LIMIT 1', [String(planParam)]);
      planRow = rows[0] || null;
    }
    if (!planRow) {
      return res.status(404).json({ message: 'Plan not found' });
    }
    const startDate = new Date();
    const endDate = new Date(startDate);
    const durationDays = Number(planRow.duration_days || 30);
    endDate.setDate(endDate.getDate() + durationDays);
    const sub = await Subscription.create({
      userId: req.user.id,
      plan: planRow.code || String(planRow.id),
      price: Number(planRow.price),
      status: 'active',
      startDate,
      endDate,
      autoRenew: true
    });
    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    console.error('Purchase subscription error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
