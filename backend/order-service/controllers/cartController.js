const Cart = require('../models/Cart');
const { validationResult } = require('express-validator');
const axios = require('axios');

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.getOrCreateCart(userId);

    res.json({
      success: true,
      data: { cart }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { productId, color, size, quantity } = req.body;
    const userId = req.user.userId;

    // Verify product exists and get details
    try {
      const productResponse = await axios.get(
        `${process.env.PRODUCT_SERVICE_URL}/api/products/${productId}`
      );
      
      if (!productResponse.data.success) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = productResponse.data.data.product;

      // Check if variant exists and is in stock
      const variant = product.variants.find(v => 
        v.color.toLowerCase() === color.toLowerCase() && 
        v.size.toLowerCase() === size.toLowerCase()
      );

      if (!variant) {
        return res.status(400).json({
          success: false,
          message: 'Product variant not found'
        });
      }

      if (variant.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock'
        });
      }

      // Get or create cart
      const cart = await Cart.getOrCreateCart(userId);

      // Check if item already exists in cart
      const existingItem = cart.getItem(productId, color, size);
      if (existingItem && (existingItem.quantity + quantity) > variant.stock) {
        return res.status(400).json({
          success: false,
          message: 'Cannot add more items than available in stock'
        });
      }

      // Create cart item
      const cartItem = {
        productId,
        productName: product.name,
        productImage: product.primaryImage || product.images[0]?.url || '',
        variant: {
          color,
          size,
          sku: variant.sku
        },
        quantity,
        unitPrice: variant.price || product.price,
        totalPrice: (variant.price || product.price) * quantity
      };

      await cart.addItem(cartItem);

      res.json({
        success: true,
        message: 'Item added to cart successfully',
        data: { cart }
      });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { productId, color, size, quantity } = req.body;
    const userId = req.user.userId;

    // Verify product exists and check stock
    try {
      const productResponse = await axios.get(
        `${process.env.PRODUCT_SERVICE_URL}/api/products/${productId}`
      );
      
      if (!productResponse.data.success) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = productResponse.data.data.product;
      const variant = product.variants.find(v => 
        v.color.toLowerCase() === color.toLowerCase() && 
        v.size.toLowerCase() === size.toLowerCase()
      );

      if (!variant) {
        return res.status(400).json({
          success: false,
          message: 'Product variant not found'
        });
      }

      if (quantity > variant.stock) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock'
        });
      }

      const cart = await Cart.getOrCreateCart(userId);
      await cart.updateItemQuantity(productId, color, size, quantity);

      res.json({
        success: true,
        message: 'Cart item updated successfully',
        data: { cart }
      });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { productId, color, size } = req.body;
    const userId = req.user.userId;

    const cart = await Cart.getOrCreateCart(userId);
    await cart.removeItem(productId, color, size);

    res.json({
      success: true,
      message: 'Item removed from cart successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.getOrCreateCart(userId);
    await cart.clear();

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      data: { cart }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
