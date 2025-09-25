const express = require('express');
const { body } = require('express-validator');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const addToCartValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('color').notEmpty().withMessage('Color is required'),
  body('size').notEmpty().withMessage('Size is required'),
  body('quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100')
];

const updateCartItemValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('color').notEmpty().withMessage('Color is required'),
  body('size').notEmpty().withMessage('Size is required'),
  body('quantity').isInt({ min: 0, max: 100 }).withMessage('Quantity must be between 0 and 100')
];

const removeFromCartValidation = [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('color').notEmpty().withMessage('Color is required'),
  body('size').notEmpty().withMessage('Size is required')
];

// All cart routes require authentication
router.use(authenticate);

// Routes
router.get('/', getCart);
router.post('/add', addToCartValidation, addToCart);
router.put('/update', updateCartItemValidation, updateCartItem);
router.delete('/remove', removeFromCartValidation, removeFromCart);
router.delete('/clear', clearCart);

module.exports = router;
