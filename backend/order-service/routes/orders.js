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
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order (step 1)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - addressId
 *               - paymentMethod
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *                 example: "507f1f77bcf86cd799439011"
 *               addressId:
 *                 type: string
 *                 description: Address ID
 *                 example: "507f1f77bcf86cd799439012"
 *               paymentMethod:
 *                 type: string
 *                 enum: [COD, Momo, Bank]
 *                 example: "COD"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         order:
 *                           $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validation error
 */
router.post('/', createOrderValidation, createOrder);

/**
 * @swagger
 * /api/orders/items:
 *   post:
 *     summary: Add items to an order (step 2)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - items
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID
 *                 example: "507f1f77bcf86cd799439013"
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - variantId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439014"
 *                     variantId:
 *                       type: string
 *                       example: "507f1f77bcf86cd799439015"
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 100
 *                       example: 2
 *     responses:
 *       200:
 *         description: Items added successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 */
router.post('/items', addOrderItemsValidation, addOrderItems);

// Customer routes - userId in request body
/**
 * @swagger
 * /api/orders/my-orders:
 *   post:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [Pending, Paid, Failed, Refunded]
 *       - in: query
 *         name: shipmentStatus
 *         schema:
 *           type: string
 *           enum: [Pending, Packed, Delivered, Returned]
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/my-orders', getUserOrdersValidation, getUserOrders);

/**
 * @swagger
 * /api/orders/stats:
 *   post:
 *     summary: Get user order statistics
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/stats', getOrderStatsValidation, getOrderStats);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *         example: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         order:
 *                           $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */
router.get('/:id', getOrderByIdValidation, getOrderById);

// Admin routes (no authentication for simplicity)
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [Pending, Paid, Failed, Refunded]
 *       - in: query
 *         name: shipmentStatus
 *         schema:
 *           type: string
 *           enum: [Pending, Packed, Delivered, Returned]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, finalPrice, paymentStatus, shipmentStatus]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', getAllOrdersValidation, getAllOrders);

/**
 * @swagger
 * /api/orders/{id}/payment-status:
 *   put:
 *     summary: Update order payment status (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, Paid, Failed, Refunded]
 *                 example: "Paid"
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 */
router.put('/:id/payment-status', updatePaymentStatusValidation, updatePaymentStatus);

/**
 * @swagger
 * /api/orders/{id}/shipment-status:
 *   put:
 *     summary: Update order shipment status (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Pending, Packed, Delivered, Returned]
 *                 example: "Packed"
 *     responses:
 *       200:
 *         description: Shipment status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 */
router.put('/:id/shipment-status', updateShipmentStatusValidation, updateShipmentStatus);

/**
 * @swagger
 * /api/orders/{id}/discount:
 *   put:
 *     summary: Apply discount to order (Admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - discount
 *             properties:
 *               discount:
 *                 type: number
 *                 minimum: 0
 *                 description: Discount amount
 *                 example: 10.50
 *     responses:
 *       200:
 *         description: Discount applied successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 */
router.put('/:id/discount', applyDiscountValidation, applyDiscount);

module.exports = router;