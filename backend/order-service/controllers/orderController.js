const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const { validationResult } = require('express-validator');
const productService = require('../services/productService');
const userService = require('../services/userService');

const LOYALTY_POINT_EARNING_UNIT = 10_000; // 10,000 VND -> 1 point
const LOYALTY_POINT_REDEMPTION_VALUE = 1_000; // 1 point = 1,000 VND when redeemed

// Create new order (Step 1: Create order with basic info)
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

    const { userId, addressId, paymentMethod } = req.body;
    
    // Validate user exists
    let userExists;
    try {
      userExists = await userService.validateUser(userId);
    } catch (svcErr) {
      return res.status(svcErr.customStatus || 503).json({
        success: false,
        message: svcErr.message,
        code: svcErr.customCode || 'DEPENDENCY_UNAVAILABLE'
      });
    }
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate customer exists
    let customerExists;
    try {
      customerExists = await userService.validateCustomer(userId);
    } catch (svcErr) {
      return res.status(svcErr.customStatus || 503).json({
        success: false,
        message: svcErr.message,
        code: svcErr.customCode || 'DEPENDENCY_UNAVAILABLE'
      });
    }
    if (!customerExists) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    // Validate address belongs to user
    let addressExists;
    try {
      addressExists = await userService.validateAddressOwnership(addressId, userId);
    } catch (svcErr) {
      return res.status(svcErr.customStatus || 503).json({
        success: false,
        message: svcErr.message,
        code: svcErr.customCode || 'DEPENDENCY_UNAVAILABLE'
      });
    }
    if (!addressExists) {
      return res.status(400).json({
        success: false,
        message: 'Address not found or does not belong to user'
      });
    }

    // Get user and customer details for logging
    let user, address;
    try {
      user = await userService.getUserById(userId);
      address = await userService.getAddressById(addressId, userId);
    } catch (svcErr) {
      return res.status(svcErr.customStatus || 503).json({
        success: false,
        message: svcErr.message,
        code: svcErr.customCode || 'DEPENDENCY_UNAVAILABLE'
      });
    }
    
    console.log(`Creating order for user ${user.name} (${user.email}) with address ${address.name}: ${address.addressInfo}`);

    // Create order with initial values
    const order = new Order({
      userId,
      addressId,
      paymentMethod,
      totalPrice: 0, // Will be calculated when order items are added
      discount: 0,
      finalPrice: 0,
      itemCount: 0
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { 
        order: {
          _id: order._id,
          userId: order.userId,
          addressId: order.addressId,
          paymentMethod: order.paymentMethod,
          totalPrice: order.totalPrice,
          discount: order.discount,
          finalPrice: order.finalPrice,
          itemCount: order.itemCount,
          paymentStatus: order.paymentStatus,
          shipmentStatus: order.shipmentStatus,
          createdAt: order.createdAt
        }
      }
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

// Add order items to existing order (Step 2: Add products to order)
const addOrderItems = async (req, res) => {
  const adjustedVariants = [];

  const revertVariantAdjustments = async () => {
    if (!adjustedVariants.length) return;

    for (const adjustment of adjustedVariants) {
      try {
        await productService.updateVariantStock(adjustment.variantId, adjustment.quantity);
      } catch (rollbackError) {
        console.error('Rollback variant stock failed:', rollbackError);
      }
    }

    adjustedVariants.length = 0;
  };

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { orderId, items } = req.body;

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can still be modified (only pending orders)
    if (order.paymentStatus !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify order that is no longer pending'
      });
    }

    const orderItems = [];
    let totalPrice = 0;
    let itemCount = 0;

    // Process each item
    for (const item of items) {
      const { productId, variantId, quantity } = item;

      // Get product details
      let product;
      try {
        product = await productService.getProductById(productId);
      } catch (svcErr) {
        return res.status(svcErr.customStatus || 503).json({
          success: false,
          message: svcErr.message,
          code: svcErr.customCode || 'DEPENDENCY_UNAVAILABLE'
        });
      }
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${productId} not found`
        });
      }

      // Get variant details
      let variant;
      try {
        variant = await productService.getVariantById(variantId);
      } catch (svcErr) {
        return res.status(svcErr.customStatus || 503).json({
          success: false,
          message: svcErr.message,
          code: svcErr.customCode || 'DEPENDENCY_UNAVAILABLE'
        });
      }
      // In product service, variant.productId may be populated (object) or ObjectId/string
      const variantProductId = (variant && variant.productId)
        ? (typeof variant.productId === 'object'
            ? (variant.productId._id ? variant.productId._id.toString() : variant.productId.toString())
            : variant.productId.toString())
        : null;
      if (!variant || variantProductId !== productId) {
        return res.status(400).json({
          success: false,
          message: `Variant ${variantId} not found or does not belong to product ${productId}`
        });
      }

      // Check stock availability
      if (variant.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name} - ${variant.size}. Available: ${variant.stock}, Requested: ${quantity}`
        });
      }

      try {
        await productService.updateVariantStock(variantId, -quantity);
        adjustedVariants.push({ variantId, quantity });
      } catch (stockError) {
        console.error('Failed to update variant stock:', stockError);
        await revertVariantAdjustments();
        return res.status(stockError.customStatus || 500).json({
          success: false,
          message: stockError.message || 'Failed to update variant stock',
          code: stockError.customCode || 'VARIANT_STOCK_UPDATE_FAILED'
        });
      }

      // Get primary image (first image)
      const primaryImage = product.images && product.images.length > 0 ? product.images[0] : '';

      // Use variant price (not product defaultPrice)
      const variantPrice = variant.price || product.defaultPrice || 0;
      
      // Calculate sub price
      const subPrice = variantPrice * quantity;

      // Create order item with variant information
      const orderItem = new OrderItem({
        orderId,
        productId,
        variantId,
        productName: product.name,
        brand: product.brand,
        color: product.color,
        size: variant.size,
        sku: variant.sku,
        variantStatus: variant.status,
        price: variantPrice, // Use variant price
        quantity,
        subPrice,
        image: primaryImage,
        categoryInfo: {
          masterCategory: product.categoryId?.masterCategory || 'Unknown',
          subCategory: product.categoryId?.subCategory || 'Unknown',
          articleType: product.categoryId?.articleType || 'Unknown'
        }
      });

      // Debug log for each order item prepared
      console.log('Order item prepared:', {
        orderId,
        productId,
        variantId,
        productName: orderItem.productName,
        brand: orderItem.brand,
        color: orderItem.color,
        size: orderItem.size,
        sku: orderItem.sku,
        variantStatus: orderItem.variantStatus,
        price: orderItem.price,
        quantity: orderItem.quantity,
        subPrice: orderItem.subPrice,
        image: orderItem.image,
        categoryInfo: orderItem.categoryInfo
      });

      orderItems.push(orderItem);
      totalPrice += subPrice;
      itemCount += quantity;
    }

    // Save all order items
    await OrderItem.insertMany(orderItems);

    // Debug log summary after insertion
    console.log('Inserted order items summary:', {
      orderId,
      itemsCount: orderItems.length,
      totalQuantity: itemCount,
      totalPrice,
      itemIds: orderItems.map(oi => ({ productId: oi.productId, variantId: oi.variantId }))
    });

    // Update order totals
    order.totalPrice = totalPrice;
    order.finalPrice = totalPrice - order.discount;
    order.itemCount = itemCount;
    await order.save();

    res.status(201).json({
      success: true,
      message: 'Order items added successfully',
      data: { 
        orderItems,
        updatedOrder: {
          _id: order._id,
          totalPrice: order.totalPrice,
          discount: order.discount,
          finalPrice: order.finalPrice,
          itemCount: order.itemCount
        }
      }
    });
  } catch (error) {
    console.error('Add order items error:', error);
    await revertVariantAdjustments();
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId } = req.body;
    const { page = 1, limit = 10, paymentStatus, shipmentStatus } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId, isActive: true };
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (shipmentStatus) filter.shipmentStatus = shipmentStatus;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Order.countDocuments(filter);

    // Add order number to each order
    const ordersWithNumber = orders.map(order => ({
      ...order,
      orderNumber: `ORD-${order.createdAt.getTime()}-${order._id.toString().slice(-6)}`
    }));

    res.json({
      success: true,
      data: {
        orders: ordersWithNumber,
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

// Get single order with items
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user ID from authenticated user (if not admin)
    const userId = req.userId;

    const filter = { _id: id, isActive: true };
    if (userId) filter.userId = userId;

    const order = await Order.findOne(filter);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get order items
    const orderItems = await OrderItem.find({ orderId: id, isActive: true }).sort({ createdAt: 1 });

    // Add order number
    const orderWithNumber = {
      ...order.toObject(),
      orderNumber: `ORD-${order.createdAt.getTime()}-${order._id.toString().slice(-6)}`
    };

    res.json({
      success: true,
      data: { 
        order: orderWithNumber,
        orderItems
      }
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

// Update payment status
const updatePaymentStatus = async (req, res) => {
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
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const rawStatus = typeof status === 'string' ? status.trim() : '';
    const lowerStatus = rawStatus.toLowerCase();

    let normalizedStatus;
    if (lowerStatus === 'complete' || lowerStatus === 'completed') {
      normalizedStatus = 'Paid';
    } else if (['pending', 'paid', 'failed', 'refunded'].includes(lowerStatus)) {
      normalizedStatus = lowerStatus.charAt(0).toUpperCase() + lowerStatus.slice(1);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }

    const previousStatus = order.paymentStatus;
    const shouldAwardPoints = normalizedStatus === 'Paid' && previousStatus !== 'Paid';
    let loyaltyPointsAwarded = 0;

    if (shouldAwardPoints) {
      const finalPrice = Number(order.finalPrice || 0);
      const calculatedPoints = Math.floor(finalPrice / LOYALTY_POINT_EARNING_UNIT);

      if (calculatedPoints > 0) {
        try {
          await userService.addLoyaltyPoints(order.userId, calculatedPoints);
          loyaltyPointsAwarded = calculatedPoints;
        } catch (svcErr) {
          console.error('Failed to update loyalty points:', svcErr);
          return res.status(svcErr.customStatus || 503).json({
            success: false,
            message: svcErr.message || 'Failed to update loyalty points',
            code: svcErr.customCode || 'LOYALTY_UPDATE_FAILED'
          });
        }
      }
    }

    await order.updatePaymentStatus(normalizedStatus);

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: { order, loyaltyPointsAwarded, loyaltyPointRedemptionValue: LOYALTY_POINT_REDEMPTION_VALUE }
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    
    // Handle validation errors (400) vs server errors (500)
    if (error.message && (
      error.message.includes('Cannot transition') || 
      error.message.includes('already') ||
      error.message.includes('Invalid payment status')
    )) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update shipment status
const updateShipmentStatus = async (req, res) => {
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
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Normalize status (similar to payment status)
    const rawStatus = typeof status === 'string' ? status.trim() : '';
    const lowerStatus = rawStatus.toLowerCase();
    
    let normalizedStatus;
    if (['pending', 'packed', 'delivered', 'returned'].includes(lowerStatus)) {
      normalizedStatus = lowerStatus.charAt(0).toUpperCase() + lowerStatus.slice(1);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment status'
      });
    }

    await order.updateShipmentStatus(normalizedStatus);

    res.json({
      success: true,
      message: 'Shipment status updated successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Update shipment status error:', error);
    
    // Handle validation errors (400) vs server errors (500)
    if (error.message && (
      error.message.includes('Cannot transition') || 
      error.message.includes('already') ||
      error.message.includes('Invalid shipment status')
    )) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Apply discount to order
const applyDiscount = async (req, res) => {
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
    const { discount } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (discount > order.totalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Discount cannot be greater than total price'
      });
    }

    order.discount = discount;
    order.finalPrice = order.totalPrice - discount;
    await order.save();

    res.json({
      success: true,
      message: 'Discount applied successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Apply discount error:', error);
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId } = req.body;
    const { startDate, endDate } = req.query;

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
      paymentStatus,
      shipmentStatus,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = { isActive: true };
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (shipmentStatus) filter.shipmentStatus = shipmentStatus;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Order.countDocuments(filter);

    // Enrich orders with user information and order numbers
    const ordersWithNumber = await Promise.all(
      orders.map(async (order) => {
        let userInfo = {
          name: 'Unknown User',
          email: 'N/A'
        };

        try {
          const user = await userService.getUserById(order.userId);
          if (user) {
            userInfo = {
              name: user.name || 'Unknown User',
              email: user.email || 'N/A'
            };
          }
        } catch (error) {
          console.error(`Failed to fetch user ${order.userId}:`, error.message);
          // Continue with default values if user service fails
        }

        // Format order number: ORD-YYYYMMDD-HHMMSS-XXXXXX
        const createdAt = new Date(order.createdAt);
        const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const timeStr = createdAt.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
        const orderIdSuffix = order._id.toString().slice(-6);
        const orderNumber = `ORD-${dateStr}-${timeStr}-${orderIdSuffix}`;

        return {
          ...order,
          orderNumber,
          user: userInfo
        };
      })
    );

    res.json({
      success: true,
      data: {
        orders: ordersWithNumber,
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
  addOrderItems,
  getUserOrders,
  getOrderById,
  updatePaymentStatus,
  updateShipmentStatus,
  applyDiscount,
  getOrderStats,
  getAllOrders
};