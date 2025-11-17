const express = require('express');
const passport = require('passport');
const { validationResult } = require('express-validator');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getUserById,
  googleCallback,
  googleFailure,
  forgotPassword
} = require('../controllers/authController');
const { authenticate, internalAuth } = require('../middleware/auth');
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
router.post('/forgot-password', forgotPassword);

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/api/auth/google/failure' }),
  googleCallback
);

router.get('/google/failure', googleFailure);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, authValidation.updateProfile, handleValidationErrors, updateProfile);
router.put('/change-password', authenticate, authValidation.changePassword, handleValidationErrors, changePassword);

// Internal service routes (for service-to-service communication)
router.get('/internal/user/:id', internalAuth, getUserById);

module.exports = router;
