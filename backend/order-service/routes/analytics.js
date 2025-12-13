const express = require('express');
const { query } = require('express-validator');
const {
  getTopProducts,
  getOrdersStats,
  getTopCustomers,
  getDashboardOverview
} = require('../controllers/analyticsController');

const router = express.Router();

// Validation rules
const analyticsValidation = [
  query('period').optional().isIn(['day', 'month', 'year', 'all']).withMessage('Period must be day, month, year, or all'),
  query('date').optional().isString().withMessage('Date must be a string'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['quantity', 'revenue']).withMessage('SortBy must be quantity or revenue')
];

const topProductsValidation = [
  query('period').optional().isIn(['day', 'month', 'year', 'all']).withMessage('Period must be day, month, year, or all'),
  query('date').optional().isString().withMessage('Date must be a string'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['quantity', 'revenue']).withMessage('SortBy must be quantity or revenue')
];

const ordersStatsValidation = [
  query('period').optional().isIn(['day', 'month', 'year', 'all']).withMessage('Period must be day, month, year, or all'),
  query('date').optional().isString().withMessage('Date must be a string')
];

const topCustomersValidation = [
  query('period').optional().isIn(['day', 'month', 'year', 'all']).withMessage('Period must be day, month, year, or all'),
  query('date').optional().isString().withMessage('Date must be a string'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const overviewValidation = [
  query('period').optional().isIn(['day', 'month', 'year', 'all']).withMessage('Period must be day, month, year, or all'),
  query('date').optional().isString().withMessage('Date must be a string')
];

// Analytics routes
/**
 * @swagger
 * /api/orders/analytics/top-products:
 *   get:
 *     summary: Get top products by sales
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, month, year, all]
 *           default: all
 *         description: Time period
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date filter (YYYY-MM-DD for day, YYYY-MM for month, YYYY for year)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of top products to return
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [quantity, revenue]
 *           default: revenue
 *         description: Sort by quantity or revenue
 *     responses:
 *       200:
 *         description: Top products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/top-products', topProductsValidation, getTopProducts);

/**
 * @swagger
 * /api/orders/analytics/orders-stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, month, year, all]
 *           default: all
 *         description: Time period
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date filter
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/orders-stats', ordersStatsValidation, getOrdersStats);

/**
 * @swagger
 * /api/orders/analytics/top-customers:
 *   get:
 *     summary: Get top customers by order value
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, month, year, all]
 *           default: all
 *         description: Time period
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of top customers to return
 *     responses:
 *       200:
 *         description: Top customers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/top-customers', topCustomersValidation, getTopCustomers);

/**
 * @swagger
 * /api/orders/analytics/overview:
 *   get:
 *     summary: Get dashboard overview (all metrics)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, month, year, all]
 *           default: all
 *         description: Time period
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Date filter
 *     responses:
 *       200:
 *         description: Dashboard overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/overview', overviewValidation, getDashboardOverview);

module.exports = router;
