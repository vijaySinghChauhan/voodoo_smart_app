const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const controller = require('../controllers/subscriptionController');

router.get('/plans', controller.getPlans);
router.use(protect);
router.get('/', controller.listMySubscriptions);
router.post('/purchase', controller.purchase);

module.exports = router;
