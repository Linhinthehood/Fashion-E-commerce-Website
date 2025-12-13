const express = require('express');
const { query, param, body } = require('express-validator');
const {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsBySubCategory,
  getProductsByBrand,
  getProductsByGender,
  searchProducts,
  getSubCategoriesByMaster,
  getProductStats,
  uploadProductImages,
  deleteProductImage,
  upload
} = require('../controllers/productController');

const router = express.Router();

// Validation rules
const createProductValidation = [
  body('name').notEmpty().isLength({ max: 100 }).withMessage('Product name is required and cannot exceed 100 characters'),
  body('description').notEmpty().isLength({ max: 2000 }).withMessage('Product description is required and cannot exceed 2000 characters'),
  body('brand').notEmpty().isLength({ max: 50 }).withMessage('Brand is required and cannot exceed 50 characters'),
  body('gender').isIn(['Male', 'Female', 'Unisex']).withMessage('Invalid gender'),
  body('usage').notEmpty().isLength({ max: 100 }).withMessage('Usage is required and cannot exceed 100 characters'),
  body('color').notEmpty().isLength({ max: 50 }).withMessage('Color is required and cannot exceed 50 characters'),
  body('categoryId').isMongoId().withMessage('Invalid category ID')
];

const getProductsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('categoryId').optional().isMongoId().withMessage('Invalid category ID'),
  query('brand').optional().isLength({ max: 50 }).withMessage('Brand cannot exceed 50 characters'),
  query('gender').optional().isIn(['Male', 'Female', 'Unisex']).withMessage('Invalid gender'),
  query('color').optional().isLength({ max: 50 }).withMessage('Color cannot exceed 50 characters'),
  query('sortBy').optional().isIn(['createdAt', 'name', 'brand']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a non-negative number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a non-negative number')
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
  body('usage').optional().isLength({ max: 100 }).withMessage('Usage cannot exceed 100 characters'),
  body('color').optional().isLength({ max: 50 }).withMessage('Color cannot exceed 50 characters'),
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

// Routes
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get list of products with filtering and pagination
 *     tags: [Products]
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
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [Male, Female, Unisex]
 *         description: Filter by gender
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by color
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, name, brand]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
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
 *                         products:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Product'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             currentPage:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *                             totalProducts:
 *                               type: integer
 */
router.get('/', getProductsValidation, getProducts);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - brand
 *               - gender
 *               - usage
 *               - color
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Classic T-Shirt"
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "A comfortable classic t-shirt"
 *               brand:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Nike"
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Unisex]
 *                 example: "Male"
 *               usage:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Casual"
 *               color:
 *                 type: string
 *                 maxLength: 50
 *                 example: "Black"
 *               categoryId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Product images (max 10)
 *     responses:
 *       201:
 *         description: Product created successfully
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
 *                         product:
 *                           $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', upload.array('images', 10), createProductValidation, createProduct);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products by query
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *         example: "t-shirt"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results
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
 *                         products:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Product'
 *       400:
 *         description: Search query is required
 */
router.get('/search', searchValidation, searchProducts);

/**
 * @swagger
 * /api/products/stats:
 *   get:
 *     summary: Get product statistics
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', getProductStats);
/**
 * @swagger
 * /api/products/master/{masterCategory}/sub-categories:
 *   get:
 *     summary: Get sub-categories by master category
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: masterCategory
 *         required: true
 *         schema:
 *           type: string
 *         description: Master category name
 *         example: "Clothing"
 *     responses:
 *       200:
 *         description: Sub-categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/master/:masterCategory/sub-categories', getSubCategoriesByMaster);

/**
 * @swagger
 * /api/products/master/{masterCategory}/sub-category/{subCategory}:
 *   get:
 *     summary: Get products by master and sub category
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: masterCategory
 *         required: true
 *         schema:
 *           type: string
 *         description: Master category name
 *         example: "Clothing"
 *       - in: path
 *         name: subCategory
 *         required: true
 *         schema:
 *           type: string
 *         description: Sub category name
 *         example: "T-Shirts"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 12
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/master/:masterCategory/sub-category/:subCategory', getProductsBySubCategory);

/**
 * @swagger
 * /api/products/brand/{brand}:
 *   get:
 *     summary: Get products by brand
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: brand
 *         required: true
 *         schema:
 *           type: string
 *         description: Brand name
 *         example: "Nike"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of products
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/brand/:brand', getProductsByBrandValidation, getProductsByBrand);

/**
 * @swagger
 * /api/products/gender/{gender}:
 *   get:
 *     summary: Get products by gender
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: gender
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Male, Female, Unisex]
 *         description: Target gender
 *         example: "Male"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of products
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/gender/:gender', getProductsByGenderValidation, getProductsByGender);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Product retrieved successfully
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
 *                         product:
 *                           $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get('/:id', getProductByIdValidation, getProductById);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               brand:
 *                 type: string
 *                 maxLength: 50
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Unisex]
 *               usage:
 *                 type: string
 *                 maxLength: 100
 *               color:
 *                 type: string
 *                 maxLength: 50
 *               categoryId:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.put('/:id', upload.array('images', 10), updateProductValidation, updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.delete('/:id', getProductByIdValidation, deleteProduct);

// Image upload routes
/**
 * @swagger
 * /api/products/{productId}/images:
 *   post:
 *     summary: Upload product images
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Product images (max 10)
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
router.post('/:productId/images', upload.array('images', 10), uploadProductImages);

/**
 * @swagger
 * /api/products/{productId}/images/{imageUrl}:
 *   delete:
 *     summary: Delete a product image
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: path
 *         name: imageUrl
 *         required: true
 *         schema:
 *           type: string
 *         description: Image URL to delete
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product or image not found
 */
router.delete('/:productId/images/:imageUrl(*)', deleteProductImage);

module.exports = router;
