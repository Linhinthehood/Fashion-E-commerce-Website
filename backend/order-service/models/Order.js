const mongoose = require('mongoose');

// Schema for payment history tracking
const paymentHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  updateAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Schema for shipment history tracking
const shipmentHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Packed', 'Delivered', 'Returned'],
    default: 'Pending'
  },
  updateAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  finalPrice: {
    type: Number,
    required: [true, 'Final price is required'],
    min: [0, 'Final price cannot be negative']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: {
      values: ['COD', 'Momo', 'Bank'],
      message: 'Payment method must be COD, Momo, or Bank'
    },
    default: 'COD'
  },
  paymentStatus: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: {
      values: ['Pending', 'Paid', 'Failed', 'Refunded'],
      message: 'Payment status must be Pending, Paid, Failed, or Refunded'
    },
    default: 'Pending'
  },
  paymentHistory: [paymentHistorySchema],
  shipmentStatus: {
    type: String,
    required: [true, 'Shipment status is required'],
    enum: {
      values: ['Pending', 'Packed', 'Delivered', 'Returned'],
      message: 'Shipment status must be Pending, Packed, Delivered, or Returned'
    },
    default: 'Pending'
  },
  shipmentHistory: [shipmentHistorySchema],
  itemCount: {
    type: Number,
    default: 0,
    min: [0, 'Item count cannot be negative']
  },
  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Address ID is required']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ shipmentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ finalPrice: -1 });

// Method to generate order number
orderSchema.methods.generateOrderNumber = function() {
  const timestamp = this.createdAt.getTime();
  const id = this._id.toString().slice(-6);
  return `ORD-${timestamp}-${id}`;
};

// Method to update payment status and add to history
orderSchema.methods.updatePaymentStatus = function(newStatus) {
  if (!['Pending', 'Paid', 'Failed', 'Refunded'].includes(newStatus)) {
    throw new Error('Invalid payment status');
  }
  
  this.paymentStatus = newStatus;
  this.paymentHistory.push({
    status: newStatus,
    updateAt: new Date()
  });
  
  return this.save();
};

// Method to update shipment status and add to history
orderSchema.methods.updateShipmentStatus = function(newStatus) {
  if (!['Pending', 'Packed', 'Delivered', 'Returned'].includes(newStatus)) {
    throw new Error('Invalid shipment status');
  }
  
  this.shipmentStatus = newStatus;
  this.shipmentHistory.push({
    status: newStatus,
    updateAt: new Date()
  });
  
  return this.save();
};

// Method to calculate final price based on total and discount
orderSchema.methods.calculateFinalPrice = function() {
  this.finalPrice = this.totalPrice - this.discount;
  return this.finalPrice;
};

// Static method to get orders by user
orderSchema.statics.getByUser = function(userId, options = {}) {
  const { page = 1, limit = 10, status, paymentStatus, shipmentStatus } = options;
  const skip = (page - 1) * limit;
  
  const filter = { userId, isActive: true };
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (shipmentStatus) filter.shipmentStatus = shipmentStatus;
  
  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = async function(userId = null, startDate = null, endDate = null) {
  const match = { isActive: true };
  
  if (userId) match.userId = userId;
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$finalPrice' },
        averageOrderValue: { $avg: '$finalPrice' },
        totalItems: { $sum: '$itemCount' }
      }
    }
  ]);

  const paymentStatusStats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$paymentStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  const shipmentStatusStats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$shipmentStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    general: stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      totalItems: 0
    },
    byPaymentStatus: paymentStatusStats,
    byShipmentStatus: shipmentStatusStats
  };
};

// Pre-save middleware to calculate final price and initialize histories
orderSchema.pre('save', function(next) {
  // Calculate final price
  this.finalPrice = this.totalPrice - this.discount;
  
  // Initialize payment history if empty
  if (this.paymentHistory.length === 0) {
    this.paymentHistory.push({
      status: this.paymentStatus,
      updateAt: new Date()
    });
  }
  
  // Initialize shipment history if empty
  if (this.shipmentHistory.length === 0) {
    this.shipmentHistory.push({
      status: this.shipmentStatus,
      updateAt: new Date()
    });
  }
  
  next();
});

module.exports = mongoose.model('Order', orderSchema);