const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { verifyWebhook, verifyVNPayIP } = require('../middleware/webhookVerification');

// VNPay webhook routes
// VNPay sends webhook as POST request with URL-encoded data
router.post(
  '/vnpay',
  verifyWebhook,
  verifyVNPayIP, // Optional: verify IP if configured
  webhookController.handleVNPayWebhook
);

// Also handle GET requests (some webhook systems may use GET)
router.get(
  '/vnpay',
  verifyWebhook,
  verifyVNPayIP,
  webhookController.handleVNPayWebhook
);

module.exports = router;
module.exports.handleVNPayReturn = webhookController.handleVNPayReturn;

