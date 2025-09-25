const express = require('express');
const { query, param } = require('express-validator');
const {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getNewProducts,
  getBestSellers,
  searchProducts,
  getRelatedProducts,
  checkAvailability,
  getProductStats
} = require('../controllers/productController');

const router = express.Router();

// Validation rules
const getProductsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('sortBy').optional().isIn(['createdAt', 'price', 'rating', 'sales', 'name']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const getProductByIdValidation = [
  param('id').isMongoId().withMessage('Invalid product ID')
];

const searchValidation = [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const getRelatedProductsValidation = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
];

const checkAvailabilityValidation = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  query('color').optional().notEmpty().withMessage('Color cannot be empty'),
  query('size').optional().notEmpty().withMessage('Size cannot be empty')
];

// Routes
router.get('/', getProductsValidation, getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/new', getNewProducts);
router.get('/bestsellers', getBestSellers);
router.get('/search', searchValidation, searchProducts);
router.get('/stats', getProductStats);
router.get('/:id', getProductByIdValidation, getProductById);
router.get('/:id/related', getRelatedProductsValidation, getRelatedProducts);
router.get('/:id/availability', checkAvailabilityValidation, checkAvailability);

module.exports = router;
