const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(getProducts)
  .post(protect, createProduct);

router.route('/:id')
  .get(getProduct)
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

router.post('/:id/reviews', protect, addReview);

module.exports = router;