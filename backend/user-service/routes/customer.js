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
router.get('/profile', authenticate, requireCustomer, getCustomerProfile);
router.put('/profile', authenticate, requireCustomer, customerValidation.updateProfile, handleValidationErrors, updateCustomerProfile);
router.put('/loyalty-points', authenticate, requireCustomer, customerValidation.updateLoyaltyPoints, handleValidationErrors, updateLoyaltyPoints);

// Address management routes (require authentication and customer role)
router.post('/addresses', authenticate, requireCustomer, customerValidation.addAddress, handleValidationErrors, addAddress);
router.put('/addresses/:addressId', authenticate, canManageAddresses, paramValidation.addressId, customerValidation.updateAddress, handleValidationErrors, updateAddress);
router.delete('/addresses/:addressId', authenticate, canManageAddresses, paramValidation.addressId, handleValidationErrors, deleteAddress);

// Admin/Manager routes (require authentication and admin role)
router.get('/all', authenticate, requireAdmin, customerValidation.getAllCustomers, handleValidationErrors, getAllCustomers);
router.get('/:customerId', authenticate, requireAdmin, paramValidation.customerId, handleValidationErrors, getCustomerById);

// Internal service routes (for service-to-service communication)
router.get('/internal/user/:userId', internalAuth, getCustomerByUserId);
router.post(
  '/internal/user/:userId/loyalty-points',
  internalAuth,
  paramValidation.userId,
  customerValidation.updateLoyaltyPoints,
  handleValidationErrors,
  updateLoyaltyPointsInternal
);

module.exports = router;
