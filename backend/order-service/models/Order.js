const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  productImage: {
    type: String,
    required: true
  },
  variant: {
    color: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      trim: true
    }
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [100, 'Quantity cannot exceed 100']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative']
  }
});

const shippingAddressSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Street address cannot exceed 100 characters']
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'City cannot exceed 50 characters']
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'State cannot exceed 50 characters']
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9]{5}(-[0-9]{4})?$/, 'Please provide a valid ZIP code']
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, 'Country cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  billingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    shipping: {
      type: Number,
      required: true,
      min: [0, 'Shipping cost cannot be negative'],
      default: 0
    },
    tax: {
      type: Number,
      required: true,
      min: [0, 'Tax cannot be negative'],
      default: 0
    },
    discount: {
      type: Number,
      required: true,
      min: [0, 'Discount cannot be negative'],
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    }
  },
  payment: {
    method: {
      type: String,
      required: true,
      enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'],
      default: 'credit_card'
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    transactionId: {
      type: String,
      trim: true
    },
    paidAt: {
      type: Date
    }
  },
  status: {
    type: String,
    required: true,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned',
      'refunded'
    ],
    default: 'pending'
  },
  shipping: {
    method: {
      type: String,
      required: true,
      enum: ['standard', 'express', 'overnight'],
      default: 'standard'
    },
    trackingNumber: {
      type: String,
      trim: true
    },
    carrier: {
      type: String,
      trim: true
    },
    estimatedDelivery: {
      type: Date
    },
    shippedAt: {
      type: Date
    },
    deliveredAt: {
      type: Date
    }
  },
  notes: {
    customer: {
      type: String,
      trim: true,
      maxlength: [500, 'Customer notes cannot exceed 500 characters']
    },
    internal: {
      type: String,
      trim: true,
      maxlength: [500, 'Internal notes cannot exceed 500 characters']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

// Virtual for order status display
orderSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    returned: 'Returned',
    refunded: 'Refunded'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for payment status display
orderSchema.virtual('paymentStatusDisplay').get(function() {
  const statusMap = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
    partially_refunded: 'Partially Refunded'
  };
  return statusMap[this.payment.status] || this.payment.status;
});

// Method to calculate total items
orderSchema.methods.getTotalItems = function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
};

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

// Method to check if order can be returned
orderSchema.methods.canBeReturned = function() {
  return this.status === 'delivered' && 
         new Date() <= new Date(this.deliveredAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
};

// Static method to generate order number
orderSchema.statics.generateOrderNumber = function() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
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
        totalRevenue: { $sum: '$pricing.total' },
        averageOrderValue: { $avg: '$pricing.total' },
        totalItems: { $sum: { $sum: '$items.quantity' } }
      }
    }
  ]);

  const statusStats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
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
    byStatus: statusStats
  };
};

// Pre-save middleware to generate order number
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = this.constructor.generateOrderNumber();
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
