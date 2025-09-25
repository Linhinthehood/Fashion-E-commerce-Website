const Order = require('../models/Order');
const Cart = require('../models/Cart');
const { validationResult } = require('express-validator');
const axios = require('axios');

// Create new order
const createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { 
      items, 
      shippingAddress, 
      billingAddress, 
      paymentMethod,
      shippingMethod = 'standard',
      notes = {}
    } = req.body;

    const userId = req.user.userId;

    // Calculate pricing
    const subtotal = items.reduce((total, item) => total + item.totalPrice, 0);
    const shipping = shippingMethod === 'express' ? 15 : shippingMethod === 'overnight' ? 25 : 5;
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shipping + tax;

    // Create order
    const order = new Order({
      userId,
      items,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      pricing: {
        subtotal,
        shipping,
        tax,
        discount: 0,
        total
      },
      payment: {
        method: paymentMethod,
        status: 'pending'
      },
      shipping: {
        method: shippingMethod,
        estimatedDelivery: new Date(Date.now() + (shippingMethod === 'overnight' ? 1 : shippingMethod === 'express' ? 2 : 5) * 24 * 60 * 60 * 1000)
      },
      notes,
      status: 'pending'
    });

    await order.save();

    // Clear user's cart
    await Cart.findOneAndUpdate(
      { userId, isActive: true },
      { items: [] }
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's orders
const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user.userId;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId, isActive: true };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalOrders: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single order
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({ _id: id, userId, isActive: true });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.userId;

    const order = await Order.findOne({ _id: id, userId, isActive: true });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if status change is allowed
    const allowedStatuses = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: ['returned'],
      cancelled: [],
      returned: ['refunded'],
      refunded: []
    };

    if (!allowedStatuses[order.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.status} to ${status}`
      });
    }

    // Update order
    order.status = status;
    if (notes) order.notes.internal = notes;

    // Set timestamps based on status
    if (status === 'shipped') {
      order.shipping.shippedAt = new Date();
    } else if (status === 'delivered') {
      order.shipping.deliveredAt = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    const order = await Order.findOne({ _id: id, userId, isActive: true });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    order.status = 'cancelled';
    if (reason) order.notes.customer = reason;

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user.userId;

    const stats = await Order.getOrderStats(userId, startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all orders (admin)
const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = { isActive: true };
    if (status) filter.status = status;
    if (paymentStatus) filter['payment.status'] = paymentStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await Order.find(filter)
      .populate('userId', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalOrders: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  getAllOrders
};
