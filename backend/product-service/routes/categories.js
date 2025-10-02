const express = require('express');
const { query, param, body } = require('express-validator');
const {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getProductsByCategory,
  getMasterCategories,
  getSubCategories,
  getArticleTypes,
  getCategoryStats
} = require('../controllers/categoryController');

const router = express.Router();

// Validation rules
const createCategoryValidation = [
  body('masterCategory').notEmpty().isLength({ max: 100 }).withMessage('Master category is required and cannot exceed 100 characters'),
  body('subCategory').notEmpty().isLength({ max: 100 }).withMessage('Sub category is required and cannot exceed 100 characters'),
  body('articleType').notEmpty().isLength({ max: 100 }).withMessage('Article type is required and cannot exceed 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

const getCategoryByIdValidation = [
  param('id').isMongoId().withMessage('Invalid category ID')
];

const updateCategoryValidation = [
  param('id').isMongoId().withMessage('Invalid category ID'),
  body('masterCategory').optional().isLength({ max: 100 }).withMessage('Master category cannot exceed 100 characters'),
  body('subCategory').optional().isLength({ max: 100 }).withMessage('Sub category cannot exceed 100 characters'),
  body('articleType').optional().isLength({ max: 100 }).withMessage('Article type cannot exceed 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

const getProductsByCategoryValidation = [
  param('id').isMongoId().withMessage('Invalid category ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['createdAt', 'name', 'brand']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const getSubCategoriesValidation = [
  query('masterCategory').optional().isLength({ max: 100 }).withMessage('Master category cannot exceed 100 characters')
];

const getArticleTypesValidation = [
  query('masterCategory').optional().isLength({ max: 100 }).withMessage('Master category cannot exceed 100 characters'),
  query('subCategory').optional().isLength({ max: 100 }).withMessage('Sub category cannot exceed 100 characters')
];

// Routes
router.get('/', getCategories);
router.post('/', createCategoryValidation, createCategory);
router.get('/master-categories', getMasterCategories);
router.get('/sub-categories', getSubCategoriesValidation, getSubCategories);
router.get('/article-types', getArticleTypesValidation, getArticleTypes);
router.get('/stats', getCategoryStats);
router.get('/:id', getCategoryByIdValidation, getCategoryById);
router.put('/:id', updateCategoryValidation, updateCategory);
router.delete('/:id', getCategoryByIdValidation, deleteCategory);
router.get('/:id/products', getProductsByCategoryValidation, getProductsByCategory);

module.exports = router;
