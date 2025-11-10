const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  gateway: {
    type: String,
    required: [true, 'Payment gateway is required'],
    enum: {
      values: ['VNPay', 'MoMo', 'Stripe'],
      message: 'Payment gateway must be VNPay, MoMo, or Stripe'
    },
    default: 'VNPay'
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    enum: {
      values: ['VND', 'USD'],
      message: 'Currency must be VND or USD'
    },
    default: 'VND'
  },
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: {
      values: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      message: 'Payment status must be pending, processing, completed, failed, refunded, or cancelled'
    },
    default: 'pending',
    index: true
  },
  gatewayTransactionId: {
    type: String,
    index: true,
    sparse: true
  },
  gatewayOrderId: {
    type: String,
    index: true,
    sparse: true
  },
  paymentUrl: {
    type: String
  },
  returnUrl: {
    type: String
  },
  ipnUrl: {
    type: String
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  failureReason: {
    type: String
  },
  refundedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refunded amount cannot be negative']
  },
  refundedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ gatewayTransactionId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ createdAt: -1 });

// Method to check if payment can be refunded
paymentSchema.methods.canRefund = function() {
  return this.status === 'completed' && this.refundedAmount < this.amount;
};

// Method to get remaining refundable amount
paymentSchema.methods.getRemainingRefundAmount = function() {
  if (this.status !== 'completed') {
    return 0;
  }
  return Math.max(0, this.amount - this.refundedAmount);
};

// Static method to get payments by user
paymentSchema.statics.getByUser = function(userId, options = {}) {
  const { page = 1, limit = 10, status, gateway } = options;
  const skip = (page - 1) * limit;
  
  const filter = { userId, isActive: true };
  if (status) filter.status = status;
  if (gateway) filter.gateway = gateway;
  
  return this.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get payment statistics
paymentSchema.statics.getStats = async function(userId = null, startDate = null, endDate = null) {
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
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
          }
        },
        failedAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0]
          }
        },
        refundedAmount: { $sum: '$refundedAmount' }
      }
    }
  ]);

  const statusStats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const gatewayStats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$gateway',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  return {
    general: stats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      completedAmount: 0,
      failedAmount: 0,
      refundedAmount: 0
    },
    byStatus: statusStats,
    byGateway: gatewayStats
  };
};

module.exports = mongoose.model('Payment', paymentSchema);

