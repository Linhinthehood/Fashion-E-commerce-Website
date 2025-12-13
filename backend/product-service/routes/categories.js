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
/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive categories
 *       - in: query
 *         name: masterCategory
 *         schema:
 *           type: string
 *         description: Filter by master category
 *       - in: query
 *         name: subCategory
 *         schema:
 *           type: string
 *         description: Filter by sub category
 *       - in: query
 *         name: articleType
 *         schema:
 *           type: string
 *         description: Filter by article type
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                         categories:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Category'
 */
router.get('/', getCategories);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - masterCategory
 *               - subCategory
 *               - articleType
 *             properties:
 *               masterCategory:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Clothing"
 *               subCategory:
 *                 type: string
 *                 maxLength: 100
 *                 example: "T-Shirts"
 *               articleType:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Casual"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Casual t-shirts for everyday wear"
 *     responses:
 *       201:
 *         description: Category created successfully
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
 *                         category:
 *                           $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', createCategoryValidation, createCategory);

/**
 * @swagger
 * /api/categories/master-categories:
 *   get:
 *     summary: Get all master categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Master categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/master-categories', getMasterCategories);

/**
 * @swagger
 * /api/categories/sub-categories:
 *   get:
 *     summary: Get sub-categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: masterCategory
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by master category
 *         example: "Clothing"
 *     responses:
 *       200:
 *         description: Sub-categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/sub-categories', getSubCategoriesValidation, getSubCategories);

/**
 * @swagger
 * /api/categories/article-types:
 *   get:
 *     summary: Get article types
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: masterCategory
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by master category
 *       - in: query
 *         name: subCategory
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by sub category
 *     responses:
 *       200:
 *         description: Article types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/article-types', getArticleTypesValidation, getArticleTypes);

/**
 * @swagger
 * /api/categories/stats:
 *   get:
 *     summary: Get category statistics
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', getCategoryStats);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Category retrieved successfully
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
 *                         category:
 *                           $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 */
router.get('/:id', getCategoryByIdValidation, getCategoryById);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               masterCategory:
 *                 type: string
 *                 maxLength: 100
 *               subCategory:
 *                 type: string
 *                 maxLength: 100
 *               articleType:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.put('/:id', updateCategoryValidation, updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.delete('/:id', getCategoryByIdValidation, deleteCategory);

/**
 * @swagger
 * /api/categories/{id}/products:
 *   get:
 *     summary: Get products by category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, name, brand]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Category not found
 */
router.get('/:id/products', getProductsByCategoryValidation, getProductsByCategory);

module.exports = router;
