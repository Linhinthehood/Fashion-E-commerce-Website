const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const paymentController = require('../controllers/paymentController');

// Validation rules
const initiatePaymentValidation = [
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required')
    .isMongoId()
    .withMessage('Invalid order ID'),
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('gateway')
    .optional()
    .isIn(['VNPay', 'MoMo', 'Stripe'])
    .withMessage('Invalid payment gateway'),
  body('bankCode')
    .optional()
    .isString()
    .withMessage('Bank code must be a string'),
  body('ipAddr')
    .optional()
    .isIP()
    .withMessage('Invalid IP address')
];

const getPaymentValidation = [
  param('id')
    .notEmpty()
    .withMessage('Payment ID is required')
    .isMongoId()
    .withMessage('Invalid payment ID')
];

const getUserPaymentsValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'])
    .withMessage('Invalid payment status'),
  query('gateway')
    .optional()
    .isIn(['VNPay', 'MoMo', 'Stripe'])
    .withMessage('Invalid payment gateway')
];

// Routes
router.post(
  '/initiate',
  initiatePaymentValidation,
  paymentController.initiatePayment
);

router.get(
  '/:id',
  getPaymentValidation,
  paymentController.getPaymentStatus
);

router.get(
  '/user/:userId',
  getUserPaymentsValidation,
  paymentController.getUserPayments
);

router.get(
  '/stats',
  paymentController.getPaymentStats
);

module.exports = router;

