const express = require('express');
const { body, param, query } = require('express-validator');
const {
  createOrder,
  addOrderItems,
  getUserOrders,
  getOrderById,
  updatePaymentStatus,
  updateShipmentStatus,
  applyDiscount,
  getOrderStats,
  getAllOrders
} = require('../controllers/orderController');

const router = express.Router();

// Validation rules
const createOrderValidation = [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('addressId').isMongoId().withMessage('Valid address ID is required'),
  body('paymentMethod').isIn(['COD', 'Momo', 'Bank']).withMessage('Payment method must be COD, Momo, or Bank')
];

const addOrderItemsValidation = [
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required and cannot be empty'),
  body('items.*.productId').isMongoId().withMessage('Valid product ID is required for each item'),
  body('items.*.variantId').isMongoId().withMessage('Valid variant ID is required for each item'),
  body('items.*.quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100 for each item')
];

const updatePaymentStatusValidation = [
  param('id').isMongoId().withMessage('Valid order ID is required'),
  body('status').isIn(['Pending', 'Paid', 'Failed', 'Refunded']).withMessage('Payment status must be Pending, Paid, Failed, or Refunded')
];

const updateShipmentStatusValidation = [
  param('id').isMongoId().withMessage('Valid order ID is required'),
  body('status').isIn(['Pending', 'Packed', 'Delivered', 'Returned']).withMessage('Shipment status must be Pending, Packed, Delivered, or Returned')
];

const applyDiscountValidation = [
  param('id').isMongoId().withMessage('Valid order ID is required'),
  body('discount').isFloat({ min: 0 }).withMessage('Discount must be a non-negative number')
];

const getOrderByIdValidation = [
  param('id').isMongoId().withMessage('Valid order ID is required')
];

const getUserOrdersValidation = [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('paymentStatus').optional().isIn(['Pending', 'Paid', 'Failed', 'Refunded']).withMessage('Invalid payment status'),
  query('shipmentStatus').optional().isIn(['Pending', 'Packed', 'Delivered', 'Returned']).withMessage('Invalid shipment status')
];

const getAllOrdersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('paymentStatus').optional().isIn(['Pending', 'Paid', 'Failed', 'Refunded']).withMessage('Invalid payment status'),
  query('shipmentStatus').optional().isIn(['Pending', 'Packed', 'Delivered', 'Returned']).withMessage('Invalid shipment status'),
  query('sortBy').optional().isIn(['createdAt', 'finalPrice', 'paymentStatus', 'shipmentStatus']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const getOrderStatsValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date')
];

// Simplified routes - no authentication middleware, userId passed in request body
router.post('/', createOrderValidation, createOrder);
router.post('/items', addOrderItemsValidation, addOrderItems);

// Customer routes - userId in request body
router.post('/my-orders', getUserOrdersValidation, getUserOrders);
router.post('/stats', getOrderStatsValidation, getOrderStats);
router.get('/:id', getOrderByIdValidation, getOrderById);

// Admin routes (no authentication for simplicity)
router.put('/:id/payment-status', updatePaymentStatusValidation, updatePaymentStatus);
router.put('/:id/shipment-status', updateShipmentStatusValidation, updateShipmentStatus);
router.put('/:id/discount', applyDiscountValidation, applyDiscount);
router.get('/', getAllOrdersValidation, getAllOrders);

module.exports = router;