const express = require('express');
const { query, param } = require('express-validator');
const {
  getCategories,
  getCategoryTree,
  getCategoryById,
  getProductsByCategory,
  getRootCategories,
  getCategoryStats
} = require('../controllers/categoryController');

const router = express.Router();

// Validation rules
const getCategoryByIdValidation = [
  param('id').isMongoId().withMessage('Invalid category ID')
];

const getProductsByCategoryValidation = [
  param('id').isMongoId().withMessage('Invalid category ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['createdAt', 'price', 'rating', 'sales', 'name']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

// Routes
router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/roots', getRootCategories);
router.get('/stats', getCategoryStats);
router.get('/:id', getCategoryByIdValidation, getCategoryById);
router.get('/:id/products', getProductsByCategoryValidation, getProductsByCategory);

module.exports = router;
