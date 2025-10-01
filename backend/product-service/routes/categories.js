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
  body('masterCategory').isIn(['Apparel', 'Accessories', 'Footwear']).withMessage('Invalid master category'),
  body('subCategory').isIn(['Topwear', 'Bottomwear', 'Shoes']).withMessage('Invalid sub category'),
  body('articleType').isIn(['Shirts', 'Jeans', 'Sneakers']).withMessage('Invalid article type'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

const getCategoryByIdValidation = [
  param('id').isMongoId().withMessage('Invalid category ID')
];

const updateCategoryValidation = [
  param('id').isMongoId().withMessage('Invalid category ID'),
  body('masterCategory').optional().isIn(['Apparel', 'Accessories', 'Footwear']).withMessage('Invalid master category'),
  body('subCategory').optional().isIn(['Topwear', 'Bottomwear', 'Shoes']).withMessage('Invalid sub category'),
  body('articleType').optional().isIn(['Shirts', 'Jeans', 'Sneakers']).withMessage('Invalid article type'),
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
  query('masterCategory').optional().isIn(['Apparel', 'Accessories', 'Footwear']).withMessage('Invalid master category')
];

const getArticleTypesValidation = [
  query('masterCategory').optional().isIn(['Apparel', 'Accessories', 'Footwear']).withMessage('Invalid master category'),
  query('subCategory').optional().isIn(['Topwear', 'Bottomwear', 'Shoes']).withMessage('Invalid sub category')
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
