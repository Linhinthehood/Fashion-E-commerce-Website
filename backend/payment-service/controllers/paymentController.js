const Payment = require('../models/Payment');
const VNPayService = require('../services/vnpayService');
const OrderService = require('../services/orderService');
const { validationResult } = require('express-validator');

/**
 * Initialize payment
 * @route POST /api/payments/initiate
 */
const initiatePayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { orderId, gateway = 'VNPay', bankCode, ipAddr, userId: bodyUserId } = req.body;
    const userId = req.userId || bodyUserId; // Get from auth middleware or body

    // Validate userId
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required. Provide userId in request body or use authentication token.'
      });
    }

    // Validate gateway
    if (gateway !== 'VNPay') {
      return res.status(400).json({
        success: false,
        message: 'Only VNPay gateway is supported currently'
      });
    }

    // Get order from Order Service
    const orderService = new OrderService(
      process.env.ORDER_SERVICE_URL,
      process.env.INTERNAL_SERVICE_TOKEN
    );

    let order;
    try {
      order = await orderService.getOrderById(orderId);
    } catch (error) {
      console.error('Error fetching order:', error);
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        error: error.message
      });
    }

    // Validate order exists and has required fields
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate order has userId
    if (!order.userId) {
      console.error('Order missing userId:', order);
      return res.status(500).json({
        success: false,
        message: 'Order data is invalid: missing userId'
      });
    }

    // Convert userId to string for comparison
    const orderUserId = order.userId.toString ? order.userId.toString() : String(order.userId);
    const requestUserId = userId.toString ? userId.toString() : String(userId);

    // Validate order belongs to user
    if (orderUserId !== requestUserId) {
      return res.status(403).json({
        success: false,
        message: 'Order does not belong to user'
      });
    }

    // Validate order has required fields
    if (order.finalPrice === undefined || order.finalPrice === null) {
      console.error('Order missing finalPrice:', order);
      return res.status(500).json({
        success: false,
        message: 'Order data is invalid: missing finalPrice'
      });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Order is already paid'
      });
    }

    // Check if payment already exists
    let payment = await Payment.findOne({
      orderId,
      status: { $in: ['pending', 'processing'] },
      isActive: true
    });

    if (payment) {
      // Return existing payment URL
      return res.json({
        success: true,
        message: 'Payment already initiated',
        data: {
          paymentId: payment._id,
          paymentUrl: payment.paymentUrl,
          status: payment.status
        }
      });
    }

    // Create new payment record
    payment = new Payment({
      orderId,
      userId: orderUserId, // Use order's userId to ensure consistency
      gateway,
      amount: Math.round(order.finalPrice), // Ensure amount is integer
      currency: 'VND',
      status: 'pending',
      metadata: {
        orderNumber: order.orderNumber || `ORD-${orderId}`,
        itemCount: order.itemCount || 0
      }
    });

    await payment.save();

    // Initialize VNPay service
    const vnpayService = new VNPayService({
      tmnCode: process.env.VNPAY_TMN_CODE,
      hashSecret: process.env.VNPAY_HASH_SECRET,
      url: process.env.VNPAY_URL,
      returnUrl: process.env.VNPAY_RETURN_URL,
      ipnUrl: process.env.VNPAY_IPN_URL,
      locale: 'vn',
      currCode: 'VND'
    });

    // Generate transaction reference from payment ID
    // VNPay requires vnp_TxnRef to be max 40 characters, alphanumeric only
    // Use payment ID but ensure it's a valid format
    const txnRef = payment._id.toString().replace(/[^a-zA-Z0-9]/g, '').substring(0, 40);

    // Create payment URL
    const paymentUrl = vnpayService.createPaymentUrl({
      orderId: txnRef, // Use cleaned payment ID as transaction reference
      amount: payment.amount,
      orderDescription: `Thanh toan don hang ${payment.metadata.orderNumber}`,
      orderType: 'other',
      bankCode: bankCode || '',
      ipAddr: ipAddr || req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    });

    // Update payment with URL and transaction reference
    payment.paymentUrl = paymentUrl;
    payment.gatewayOrderId = txnRef; // Store the transaction reference used in VNPay
    payment.returnUrl = process.env.VNPAY_RETURN_URL;
    payment.ipnUrl = process.env.VNPAY_IPN_URL;
    payment.status = 'processing';
    await payment.save();

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentId: payment._id,
        paymentUrl,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        gateway: payment.gateway,
        status: payment.status,
        txnRef: txnRef // Return transaction reference for reference
      }
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

/**
 * Get payment status
 * @route GET /api/payments/:id
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // Get from auth middleware

    const payment = await Payment.findOne({
      _id: id,
      isActive: true
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Check if payment belongs to user (if userId is provided)
    if (userId && payment.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Payment does not belong to user'
      });
    }

    res.json({
      success: true,
      data: {
        payment: {
          _id: payment._id,
          orderId: payment.orderId,
          userId: payment.userId,
          gateway: payment.gateway,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          gatewayTransactionId: payment.gatewayTransactionId,
          paymentUrl: payment.paymentUrl,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          completedAt: payment.completedAt,
          failedAt: payment.failedAt
        }
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user payments
 * @route GET /api/payments/user/:userId
 */
const getUserPayments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status, gateway } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const payments = await Payment.getByUser(userId, {
      page: pageNum,
      limit: limitNum,
      status,
      gateway
    });

    const total = await Payment.countDocuments({
      userId,
      isActive: true,
      ...(status && { status }),
      ...(gateway && { gateway })
    });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalPayments: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get payment statistics
 * @route GET /api/payments/stats
 */
const getPaymentStats = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;

    const stats = await Payment.getStats(userId, startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  initiatePayment,
  getPaymentStatus,
  getUserPayments,
  getPaymentStats
};

