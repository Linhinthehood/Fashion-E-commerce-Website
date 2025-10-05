const express = require('express');
const { validationResult } = require('express-validator');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authValidation } = require('../middleware/validation');

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

// Public routes
router.post('/register', authValidation.register, handleValidationErrors, register);
router.post('/login', authValidation.login, handleValidationErrors, login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, authValidation.updateProfile, handleValidationErrors, updateProfile);
router.put('/change-password', authenticate, authValidation.changePassword, handleValidationErrors, changePassword);

module.exports = router;
