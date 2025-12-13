const express = require('express');
const { validationResult } = require('express-validator');
const {
  getCustomerProfile,
  updateCustomerProfile,
  updateLoyaltyPoints,
  getAllCustomers,
  getCustomerById,
  addAddress,
  updateAddress,
  deleteAddress,
  getCustomerByUserId,
  updateLoyaltyPointsInternal
} = require('../controllers/customerController');
const { authenticate, internalAuth } = require('../middleware/auth');
const { customerValidation, paramValidation } = require('../middleware/validation');
const { requireCustomer, requireAdmin, canManageAddresses } = require('../middleware/authorization');

const router = express.Router();

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Customer routes (require authentication and customer role)
/**
 * @swagger
 * /api/customers/profile:
 *   get:
 *     summary: Get current customer profile
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile retrieved successfully
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
 *                         customer:
 *                           $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer profile not found
 */
router.get('/profile', authenticate, requireCustomer, getCustomerProfile);

/**
 * @swagger
 * /api/customers/profile:
 *   put:
 *     summary: Update customer profile
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addresses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of address IDs
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *     responses:
 *       200:
 *         description: Customer profile updated successfully
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
 *                         customer:
 *                           $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer profile not found
 */
router.put('/profile', authenticate, requireCustomer, customerValidation.updateProfile, handleValidationErrors, updateCustomerProfile);

/**
 * @swagger
 * /api/customers/loyalty-points:
 *   put:
 *     summary: Update customer loyalty points
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *               - operation
 *             properties:
 *               points:
 *                 type: number
 *                 description: Points to add, subtract, or set
 *                 example: 100
 *               operation:
 *                 type: string
 *                 enum: [add, subtract, set]
 *                 description: Operation type
 *                 example: "add"
 *     responses:
 *       200:
 *         description: Loyalty points updated successfully
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
 *                         customer:
 *                           $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Invalid operation or insufficient points
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer profile not found
 */
router.put('/loyalty-points', authenticate, requireCustomer, customerValidation.updateLoyaltyPoints, handleValidationErrors, updateLoyaltyPoints);

// Address management routes (require authentication and customer role)
/**
 * @swagger
 * /api/customers/addresses:
 *   post:
 *     summary: Add a new address to customer profile
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - addressInfo
 *             properties:
 *               name:
 *                 type: string
 *                 description: Address name/label
 *                 example: "Home"
 *               addressInfo:
 *                 type: string
 *                 description: Full address information
 *                 example: "123 Main St, District 1, Ho Chi Minh City"
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default address
 *                 default: false
 *                 example: true
 *     responses:
 *       201:
 *         description: Address added successfully
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
 *                         address:
 *                           $ref: '#/components/schemas/Address'
 *                         customer:
 *                           $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer profile not found
 */
router.post('/addresses', authenticate, requireCustomer, customerValidation.addAddress, handleValidationErrors, addAddress);

/**
 * @swagger
 * /api/customers/addresses/{addressId}:
 *   put:
 *     summary: Update an existing address
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Address name/label
 *                 example: "Office"
 *               addressInfo:
 *                 type: string
 *                 description: Full address information
 *                 example: "456 Business Ave, District 3, Ho Chi Minh City"
 *               isDefault:
 *                 type: boolean
 *                 description: Set as default address
 *                 example: true
 *     responses:
 *       200:
 *         description: Address updated successfully
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
 *                         address:
 *                           $ref: '#/components/schemas/Address'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found or access denied
 */
router.put('/addresses/:addressId', authenticate, canManageAddresses, paramValidation.addressId, customerValidation.updateAddress, handleValidationErrors, updateAddress);

/**
 * @swagger
 * /api/customers/addresses/{addressId}:
 *   delete:
 *     summary: Delete an address
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID to delete
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found or access denied
 */
router.delete('/addresses/:addressId', authenticate, canManageAddresses, paramValidation.addressId, handleValidationErrors, deleteAddress);

// Admin/Manager routes (require authentication and admin role)
/**
 * @swagger
 * /api/customers/all:
 *   get:
 *     summary: Get all customers (Admin/Manager only)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
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
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *         example: "Ho Chi Minh City"
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *         description: Filter by district
 *         example: "District 1"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of customers retrieved successfully
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
 *                         customers:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Customer'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             current:
 *                               type: integer
 *                             pages:
 *                               type: integer
 *                             total:
 *                               type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Manager role required
 */
router.get('/all', authenticate, requireAdmin, customerValidation.getAllCustomers, handleValidationErrors, getAllCustomers);

/**
 * @swagger
 * /api/customers/{customerId}:
 *   get:
 *     summary: Get customer by ID (Admin/Manager only)
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
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
 *                         customer:
 *                           $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin/Manager role required
 *       404:
 *         description: Customer not found
 */
router.get('/:customerId', authenticate, requireAdmin, paramValidation.customerId, handleValidationErrors, getCustomerById);

// Internal service routes (for service-to-service communication)
/**
 * @swagger
 * /api/customers/internal/user/{userId}:
 *   get:
 *     summary: Get customer by user ID (Internal service only)
 *     tags: [Customers - Internal]
 *     security:
 *       - internalServiceToken: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Customer retrieved successfully
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
 *                         customer:
 *                           $ref: '#/components/schemas/Customer'
 *       401:
 *         description: Unauthorized - Invalid service token
 *       404:
 *         description: Customer not found
 */
router.get('/internal/user/:userId', internalAuth, getCustomerByUserId);

/**
 * @swagger
 * /api/customers/internal/user/{userId}/loyalty-points:
 *   post:
 *     summary: Update customer loyalty points (Internal service only)
 *     tags: [Customers - Internal]
 *     security:
 *       - internalServiceToken: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *               - operation
 *             properties:
 *               points:
 *                 type: number
 *                 description: Points to add, subtract, or set
 *                 example: 100
 *               operation:
 *                 type: string
 *                 enum: [add, subtract, set]
 *                 description: Operation type
 *                 example: "add"
 *     responses:
 *       200:
 *         description: Loyalty points updated successfully
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
 *                         customer:
 *                           $ref: '#/components/schemas/Customer'
 *       400:
 *         description: Invalid operation or insufficient points
 *       401:
 *         description: Unauthorized - Invalid service token
 *       404:
 *         description: Customer not found
 */
router.post(
  '/internal/user/:userId/loyalty-points',
  internalAuth,
  paramValidation.userId,
  customerValidation.updateLoyaltyPoints,
  handleValidationErrors,
  updateLoyaltyPointsInternal
);

module.exports = router;
