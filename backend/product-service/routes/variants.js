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
  body('size').notEmpty().withMessage('Size is required'),
  body('size').isLength({ max: 20 }).withMessage('Size cannot exceed 20 characters'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('status').optional().isIn(['Active', 'Inactive']).withMessage('Status must be Active or Inactive'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number')
];

const getVariantsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('productId').optional().isMongoId().withMessage('Invalid product ID'),
  query('status').optional().isIn(['Active', 'Inactive']).withMessage('Invalid status'),
  query('size').optional().isLength({ max: 20 }).withMessage('Size cannot exceed 20 characters'),
  query('hasStock').optional().isBoolean().withMessage('hasStock must be a boolean')
];

const getVariantByIdValidation = [
  param('id').isMongoId().withMessage('Invalid variant ID')
];

const updateVariantValidation = [
  param('id').isMongoId().withMessage('Invalid variant ID'),
  body('size').optional().isLength({ max: 20 }).withMessage('Size cannot exceed 20 characters'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
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
/**
 * @swagger
 * /api/variants:
 *   get:
 *     summary: Get list of variants with filtering and pagination
 *     tags: [Variants]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter by product ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Filter by status
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *         description: Filter by size
 *       - in: query
 *         name: hasStock
 *         schema:
 *           type: boolean
 *         description: Filter variants with stock > 0
 *     responses:
 *       200:
 *         description: List of variants retrieved successfully
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
 *                         variants:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Variant'
 *                         pagination:
 *                           type: object
 */
router.get('/', getVariantsValidation, getVariants);

/**
 * @swagger
 * /api/variants:
 *   post:
 *     summary: Create a new variant
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - size
 *               - stock
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *                 example: "507f1f77bcf86cd799439011"
 *               size:
 *                 type: string
 *                 maxLength: 20
 *                 example: "M"
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *                 example: 100
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *                 default: Active
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 29.99
 *     responses:
 *       201:
 *         description: Variant created successfully
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
 *                         variant:
 *                           $ref: '#/components/schemas/Variant'
 *       400:
 *         description: Validation error or variant already exists
 *       401:
 *         description: Unauthorized
 */
router.post('/', createVariantValidation, createVariant);

/**
 * @swagger
 * /api/variants/available:
 *   get:
 *     summary: Get all available variants (with stock > 0)
 *     tags: [Variants]
 *     responses:
 *       200:
 *         description: Available variants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/available', getAvailableVariants);

/**
 * @swagger
 * /api/variants/low-stock:
 *   get:
 *     summary: Get variants with low stock
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Stock threshold for low stock
 *     responses:
 *       200:
 *         description: Low stock variants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/low-stock', getLowStockVariantsValidation, getLowStockVariants);

/**
 * @swagger
 * /api/variants/out-of-stock:
 *   get:
 *     summary: Get out of stock variants
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Out of stock variants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/out-of-stock', getOutOfStockVariants);

/**
 * @swagger
 * /api/variants/stats:
 *   get:
 *     summary: Get variant statistics
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Variant statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', getVariantStats);

/**
 * @swagger
 * /api/variants/product/{productId}:
 *   get:
 *     summary: Get variants by product ID
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Variants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Product not found
 */
router.get('/product/:productId', getVariantsByProductValidation, getVariantsByProduct);

/**
 * @swagger
 * /api/variants/size/{size}:
 *   get:
 *     summary: Get variants by size
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: size
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 20
 *         description: Variant size
 *         example: "M"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Variants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/size/:size', getVariantsBySizeValidation, getVariantsBySize);

/**
 * @swagger
 * /api/variants/{id}:
 *   get:
 *     summary: Get variant by ID
 *     tags: [Variants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Variant retrieved successfully
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
 *                         variant:
 *                           $ref: '#/components/schemas/Variant'
 *       404:
 *         description: Variant not found
 */
router.get('/:id', getVariantByIdValidation, getVariantById);

/**
 * @swagger
 * /api/variants/{id}:
 *   put:
 *     summary: Update a variant
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               size:
 *                 type: string
 *                 maxLength: 20
 *               stock:
 *                 type: integer
 *                 minimum: 0
 *               status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *               price:
 *                 type: number
 *                 minimum: 0
 *               sku:
 *                 type: string
 *     responses:
 *       200:
 *         description: Variant updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Variant not found
 */
router.put('/:id', updateVariantValidation, updateVariant);

/**
 * @swagger
 * /api/variants/{id}:
 *   delete:
 *     summary: Delete a variant
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *     responses:
 *       200:
 *         description: Variant deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Variant not found
 */
router.delete('/:id', getVariantByIdValidation, deleteVariant);

/**
 * @swagger
 * /api/variants/{id}/stock:
 *   patch:
 *     summary: Update variant stock
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 description: Stock quantity to update (can be positive or negative)
 *                 example: 10
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Variant not found
 */
router.patch('/:id/stock', updateStockValidation, updateVariantStock);

/**
 * @swagger
 * /api/variants/{id}/reserve:
 *   patch:
 *     summary: Reserve variant stock
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to reserve
 *                 example: 5
 *     responses:
 *       200:
 *         description: Stock reserved successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Variant not found
 */
router.patch('/:id/reserve', reserveStockValidation, reserveVariantStock);

/**
 * @swagger
 * /api/variants/{id}/release:
 *   patch:
 *     summary: Release reserved variant stock
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Quantity to release
 *                 example: 5
 *     responses:
 *       200:
 *         description: Stock released successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Variant not found
 */
router.patch('/:id/release', releaseStockValidation, releaseVariantStock);


module.exports = router;
