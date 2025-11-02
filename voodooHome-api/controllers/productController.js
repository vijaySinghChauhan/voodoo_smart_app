const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Product.countDocuments();

    const products = await Product.find({ skip: startIndex, limit });

    const pagination = {};
    if (endIndex < total) pagination.next = { page: page + 1, limit };
    if (startIndex > 0) pagination.prev = { page: page - 1, limit };

    res.json({ success: true, count: products.length, pagination, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin only in a real app)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, inStock } = req.body;
    const product = await Product.create({ name, description, price, category, imageUrl, inStock });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin only in a real app)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Admin only in a real app)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.remove();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add review to product
// @route   POST /api/products/:id/reviews
// @access  Private
exports.addReview = async (req, res) => {
  try {
    const { text, rating } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.reviews = product.reviews || [];
    const alreadyReviewed = product.reviews.find(r => String(r.user) === String(req.user.id));
    if (alreadyReviewed) return res.status(400).json({ message: 'Product already reviewed' });

    product.reviews.push({ user: req.user.id, text, rating: Number(rating) });
    product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;
    await product.save();
    res.status(201).json({ success: true, message: 'Review added' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};