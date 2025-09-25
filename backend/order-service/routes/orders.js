const express = require('express');
const { body, param, query } = require('express-validator');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  getAllOrders
} = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Items array is required and cannot be empty'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.productName').notEmpty().withMessage('Product name is required'),
  body('items.*.productImage').notEmpty().withMessage('Product image is required'),
  body('items.*.variant.color').notEmpty().withMessage('Color is required'),
  body('items.*.variant.size').notEmpty().withMessage('Size is required'),
  body('items.*.variant.sku').notEmpty().withMessage('SKU is required'),
  body('items.*.quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
  body('items.*.totalPrice').isFloat({ min: 0 }).withMessage('Total price must be a positive number'),
  body('shippingAddress.firstName').notEmpty().withMessage('First name is required'),
  body('shippingAddress.lastName').notEmpty().withMessage('Last name is required'),
  body('shippingAddress.street').notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').notEmpty().withMessage('City is required'),
  body('shippingAddress.state').notEmpty().withMessage('State is required'),
  body('shippingAddress.zipCode').matches(/^[0-9]{5}(-[0-9]{4})?$/).withMessage('Invalid ZIP code'),
  body('shippingAddress.country').notEmpty().withMessage('Country is required'),
  body('shippingAddress.phone').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Invalid phone number'),
  body('billingAddress.firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('billingAddress.lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('billingAddress.street').optional().notEmpty().withMessage('Street address cannot be empty'),
  body('billingAddress.city').optional().notEmpty().withMessage('City cannot be empty'),
  body('billingAddress.state').optional().notEmpty().withMessage('State cannot be empty'),
  body('billingAddress.zipCode').optional().matches(/^[0-9]{5}(-[0-9]{4})?$/).withMessage('Invalid ZIP code'),
  body('billingAddress.country').optional().notEmpty().withMessage('Country cannot be empty'),
  body('billingAddress.phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Invalid phone number'),
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']).withMessage('Invalid payment method'),
  body('shippingMethod').optional().isIn(['standard', 'express', 'overnight']).withMessage('Invalid shipping method')
];

const getOrderByIdValidation = [
  param('id').isMongoId().withMessage('Invalid order ID')
];

const updateOrderStatusValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded']).withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

const cancelOrderValidation = [
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('reason').optional().isString().withMessage('Reason must be a string')
];

const getUserOrdersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded']).withMessage('Invalid status')
];

const getAllOrdersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded']).withMessage('Invalid status'),
  query('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']).withMessage('Invalid payment status'),
  query('sortBy').optional().isIn(['createdAt', 'pricing.total', 'status']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

// Protected routes (require authentication)
router.post('/', authenticate, createOrderValidation, createOrder);
router.get('/', authenticate, getUserOrdersValidation, getUserOrders);
router.get('/stats', authenticate, getOrderStats);
router.get('/:id', authenticate, getOrderByIdValidation, getOrderById);
router.put('/:id/status', authenticate, updateOrderStatusValidation, updateOrderStatus);
router.put('/:id/cancel', authenticate, cancelOrderValidation, cancelOrder);

// Admin routes (require admin role)
router.get('/admin/all', authenticate, authorize('admin'), getAllOrdersValidation, getAllOrders);

module.exports = router;
