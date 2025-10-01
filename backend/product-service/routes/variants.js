const express = require('express');
const { query, param, body } = require('express-validator');
const {
  getVariants,
  createVariant,
  getVariantById,
  updateVariant,
  deleteVariant,
  getVariantsByProduct,
  getVariantsBySize,
  getVariantsByColor,
  getAvailableVariants,
  getLowStockVariants,
  getOutOfStockVariants,
  updateVariantStock,
  reserveVariantStock,
  releaseVariantStock,
  getVariantStats
} = require('../controllers/variantController');

const router = express.Router();

// Validation rules
const createVariantValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('size').notEmpty().isLength({ max: 20 }).withMessage('Size is required and cannot exceed 20 characters'),
  body('color').isArray({ min: 1 }).withMessage('At least one color is required'),
  body('color.*').isString().withMessage('Each color must be a string'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('images.*').isString().withMessage('Each image must be a string'),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
];

const getVariantsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('productId').optional().isMongoId().withMessage('Invalid product ID'),
  query('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status'),
  query('size').optional().isLength({ max: 20 }).withMessage('Size cannot exceed 20 characters'),
  query('color').optional().isString().withMessage('Color must be a string'),
  query('hasStock').optional().isBoolean().withMessage('hasStock must be a boolean')
];

const getVariantByIdValidation = [
  param('id').isMongoId().withMessage('Invalid variant ID')
];

const updateVariantValidation = [
  param('id').isMongoId().withMessage('Invalid variant ID'),
  body('size').optional().isLength({ max: 20 }).withMessage('Size cannot exceed 20 characters'),
  body('color').optional().isArray({ min: 1 }).withMessage('At least one color is required'),
  body('color.*').optional().isString().withMessage('Each color must be a string'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('images.*').optional().isString().withMessage('Each image must be a string'),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('sku').optional().isString().withMessage('SKU must be a string')
];

const getVariantsByProductValidation = [
  param('productId').isMongoId().withMessage('Invalid product ID'),
  query('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status')
];

const getVariantsBySizeValidation = [
  param('size').notEmpty().isLength({ max: 20 }).withMessage('Size is required and cannot exceed 20 characters'),
  query('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status')
];

const getVariantsByColorValidation = [
  param('color').notEmpty().isString().withMessage('Color is required'),
  query('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status')
];

const getLowStockVariantsValidation = [
  query('threshold').optional().isInt({ min: 1 }).withMessage('Threshold must be a positive integer')
];

const updateStockValidation = [
  param('id').isMongoId().withMessage('Invalid variant ID'),
  body('quantity').isNumeric().withMessage('Quantity must be a number')
];

const reserveStockValidation = [
  param('id').isMongoId().withMessage('Invalid variant ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
];

const releaseStockValidation = [
  param('id').isMongoId().withMessage('Invalid variant ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
];

// Routes
router.get('/', getVariantsValidation, getVariants);
router.post('/', createVariantValidation, createVariant);
router.get('/available', getAvailableVariants);
router.get('/low-stock', getLowStockVariantsValidation, getLowStockVariants);
router.get('/out-of-stock', getOutOfStockVariants);
router.get('/stats', getVariantStats);
router.get('/product/:productId', getVariantsByProductValidation, getVariantsByProduct);
router.get('/size/:size', getVariantsBySizeValidation, getVariantsBySize);
router.get('/color/:color', getVariantsByColorValidation, getVariantsByColor);
router.get('/:id', getVariantByIdValidation, getVariantById);
router.put('/:id', updateVariantValidation, updateVariant);
router.delete('/:id', getVariantByIdValidation, deleteVariant);
router.patch('/:id/stock', updateStockValidation, updateVariantStock);
router.patch('/:id/reserve', reserveStockValidation, reserveVariantStock);
router.patch('/:id/release', releaseStockValidation, releaseVariantStock);

module.exports = router;
