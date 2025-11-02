const Order = require('../models/Order');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentId, amount } = req.body;
    const user = req.user.id;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }
    const order = new Order({ user, shippingAddress, paymentId, amount });
    const createdOrder = await order.save();
    // Persist line items to SQL order_items
    await Order.addItems(createdOrder.id, items);
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};