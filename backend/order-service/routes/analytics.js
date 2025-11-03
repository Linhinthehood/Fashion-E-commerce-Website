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
router.get('/top-products', topProductsValidation, getTopProducts);
router.get('/orders-stats', ordersStatsValidation, getOrdersStats);
router.get('/top-customers', topCustomersValidation, getTopCustomers);
router.get('/overview', overviewValidation, getDashboardOverview);

module.exports = router;
