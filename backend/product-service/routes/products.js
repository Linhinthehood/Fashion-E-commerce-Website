const express = require('express');
const { query, param, body } = require('express-validator');
const {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getProductsByBrand,
  getProductsByGender,
  getProductsBySeason,
  getProductsWithVariants,
  searchProducts,
  getProductStats
} = require('../controllers/productController');

const router = express.Router();

// Validation rules
const createProductValidation = [
  body('name').notEmpty().isLength({ max: 100 }).withMessage('Product name is required and cannot exceed 100 characters'),
  body('description').notEmpty().isLength({ max: 2000 }).withMessage('Product description is required and cannot exceed 2000 characters'),
  body('brand').notEmpty().isLength({ max: 50 }).withMessage('Brand is required and cannot exceed 50 characters'),
  body('gender').isIn(['Male', 'Female', 'Unisex']).withMessage('Invalid gender'),
  body('season').isIn(['Spring/Summer', 'Fall/Winter']).withMessage('Invalid season'),
  body('usage').notEmpty().isLength({ max: 100 }).withMessage('Usage is required and cannot exceed 100 characters'),
  body('categoryId').isMongoId().withMessage('Invalid category ID')
];

const getProductsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
  query('brand').optional().isLength({ max: 50 }).withMessage('Brand cannot exceed 50 characters'),
  query('gender').optional().isIn(['Male', 'Female', 'Unisex']).withMessage('Invalid gender'),
  query('season').optional().isIn(['Spring/Summer', 'Fall/Winter']).withMessage('Invalid season'),
  query('sortBy').optional().isIn(['createdAt', 'name', 'brand']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const getProductByIdValidation = [
  param('id').isMongoId().withMessage('Invalid product ID')
];

const updateProductValidation = [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('name').optional().isLength({ max: 100 }).withMessage('Product name cannot exceed 100 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
  body('brand').optional().isLength({ max: 50 }).withMessage('Brand cannot exceed 50 characters'),
  body('gender').optional().isIn(['Male', 'Female', 'Unisex']).withMessage('Invalid gender'),
  body('season').optional().isIn(['Spring/Summer', 'Fall/Winter']).withMessage('Invalid season'),
  body('usage').optional().isLength({ max: 100 }).withMessage('Usage cannot exceed 100 characters'),
  body('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
  body('hasImage').optional().isBoolean().withMessage('hasImage must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

const searchValidation = [
  query('q').notEmpty().withMessage('Search query is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];


const getProductsByBrandValidation = [
  param('brand').notEmpty().withMessage('Brand is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const getProductsByGenderValidation = [
  param('gender').isIn(['Male', 'Female', 'Unisex']).withMessage('Invalid gender'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const getProductsBySeasonValidation = [
  param('season').isIn(['Spring/Summer', 'Fall/Winter']).withMessage('Invalid season'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Routes
router.get('/', getProductsValidation, getProducts);
router.post('/', createProductValidation, createProduct);
router.get('/search', searchValidation, searchProducts);
router.get('/stats', getProductStats);
router.get('/with-variants', getProductsWithVariants);
router.get('/brand/:brand', getProductsByBrandValidation, getProductsByBrand);
router.get('/gender/:gender', getProductsByGenderValidation, getProductsByGender);
router.get('/season/:season', getProductsBySeasonValidation, getProductsBySeason);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id', getProductByIdValidation, getProductById);
router.put('/:id', updateProductValidation, updateProduct);
router.delete('/:id', getProductByIdValidation, deleteProduct);

module.exports = router;
