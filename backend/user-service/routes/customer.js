const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getCustomerProfile,
  updateCustomerProfile,
  updateLoyaltyPoints,
  getAllCustomers,
  getCustomerById,
  addAddress,
  updateAddress,
  deleteAddress
} = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation rules for customer profile update
const updateCustomerValidation = [
  body('addresses')
    .optional()
    .isArray()
    .withMessage('Addresses must be an array'),
  body('addresses.*')
    .optional()
    .isMongoId()
    .withMessage('Each address must be a valid ObjectId')
];

// Validation rules for loyalty points
const updateLoyaltyPointsValidation = [
  body('points')
    .isNumeric()
    .withMessage('Points must be a number')
    .custom((value) => {
      if (value < 0) {
        throw new Error('Points cannot be negative');
      }
      return true;
    }),
  body('operation')
    .optional()
    .isIn(['add', 'subtract', 'set'])
    .withMessage('Operation must be one of: add, subtract, set')
];

// Validation for customer ID parameter
const customerIdValidation = [
  param('customerId')
    .isMongoId()
    .withMessage('Invalid customer ID')
];

// Validation for address operations
const addAddressValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Address name is required and must be less than 100 characters'),
  body('addressInfo')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address info is required and must be less than 500 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean')
];

const updateAddressValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Address name must be less than 100 characters'),
  body('addressInfo')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address info must be less than 500 characters'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean')
];

const addressIdValidation = [
  param('addressId')
    .isMongoId()
    .withMessage('Invalid address ID')
];

// Validation for query parameters
const getAllCustomersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either active or inactive')
];

// Customer routes (require authentication)
router.get('/profile', authenticate, getCustomerProfile);
router.put('/profile', authenticate, updateCustomerValidation, updateCustomerProfile);
router.put('/loyalty-points', authenticate, updateLoyaltyPointsValidation, updateLoyaltyPoints);

// Address management routes
router.post('/addresses', authenticate, addAddressValidation, addAddress);
router.put('/addresses/:addressId', authenticate, addressIdValidation, updateAddressValidation, updateAddress);
router.delete('/addresses/:addressId', authenticate, addressIdValidation, deleteAddress);

// Admin/Manager routes (require authentication and proper role)
router.get('/all', authenticate, getAllCustomersValidation, getAllCustomers);
router.get('/:customerId', authenticate, customerIdValidation, getCustomerById);

module.exports = router;
