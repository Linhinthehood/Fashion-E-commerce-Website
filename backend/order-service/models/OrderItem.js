const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required']
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant',
    required: [true, 'Variant ID is required']
  },
  // Product information snapshot at time of order
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    maxlength: [100, 'Brand cannot exceed 100 characters']
  },
  // Variant information snapshot at time of order
  color: {
    type: String,
    required: [true, 'Color is required'],
    trim: true,
    maxlength: [50, 'Color cannot exceed 50 characters']
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    trim: true,
    maxlength: [20, 'Size cannot exceed 20 characters']
  },
  sku: {
    type: String,
    trim: true,
    uppercase: true
  },
  variantStatus: {
    type: String,
    required: true,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  // Price information
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    max: [100, 'Quantity cannot exceed 100']
  },
  subPrice: {
    type: Number,
    required: [true, 'Sub price is required'],
    min: [0, 'Sub price cannot be negative']
  },
  // Primary image from product (first image only)
  image: {
    type: String,
    required: [true, 'Product image is required'],
    trim: true
  },
  // Category information for filtering/reporting
  categoryInfo: {
    masterCategory: {
      type: String,
      required: true,
      trim: true
    },
    subCategory: {
      type: String,
      required: true,
      trim: true
    },
    articleType: {
      type: String,
      required: true,
      trim: true
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
orderItemSchema.index({ orderId: 1 });
orderItemSchema.index({ productId: 1 });
orderItemSchema.index({ variantId: 1 });
orderItemSchema.index({ 'categoryInfo.masterCategory': 1 });
orderItemSchema.index({ 'categoryInfo.subCategory': 1 });
orderItemSchema.index({ brand: 1 });
orderItemSchema.index({ color: 1 });
orderItemSchema.index({ size: 1 });
orderItemSchema.index({ sku: 1 });
orderItemSchema.index({ variantStatus: 1 });

// Virtual for full product name with variant
orderItemSchema.virtual('fullProductName').get(function() {
  return `${this.productName} - ${this.color} - Size ${this.size}`;
});

// Virtual for category path
orderItemSchema.virtual('categoryPath').get(function() {
  return `${this.categoryInfo.masterCategory} > ${this.categoryInfo.subCategory} > ${this.categoryInfo.articleType}`;
});

// Method to calculate sub price
orderItemSchema.methods.calculateSubPrice = function() {
  this.subPrice = this.price * this.quantity;
  return this.subPrice;
};

// Static method to get order items by order
orderItemSchema.statics.getByOrder = function(orderId) {
  return this.find({ orderId, isActive: true }).sort({ createdAt: 1 });
};

// Static method to get order items by product
orderItemSchema.statics.getByProduct = function(productId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ productId, isActive: true })
    .populate('orderId', 'customerId createdAt finalPrice')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get order items by variant
orderItemSchema.statics.getByVariant = function(variantId) {
  return this.find({ variantId, isActive: true }).sort({ createdAt: -1 });
};

// Static method to get order items by brand
orderItemSchema.statics.getByBrand = function(brand, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  return this.find({ brand, isActive: true })
    .populate('orderId', 'customerId createdAt finalPrice')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get order items by category
orderItemSchema.statics.getByCategory = function(categoryFilter, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  const filter = { isActive: true };
  if (categoryFilter.masterCategory) filter['categoryInfo.masterCategory'] = categoryFilter.masterCategory;
  if (categoryFilter.subCategory) filter['categoryInfo.subCategory'] = categoryFilter.subCategory;
  if (categoryFilter.articleType) filter['categoryInfo.articleType'] = categoryFilter.articleType;
  
  return this.find(filter)
    .populate('orderId', 'customerId createdAt finalPrice')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get popular products based on order items
orderItemSchema.statics.getPopularProducts = function(limit = 10, startDate = null, endDate = null) {
  const match = { isActive: true };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          productId: '$productId',
          productName: '$productName',
          brand: '$brand',
          image: '$image'
        },
        totalQuantity: { $sum: '$quantity' },
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$subPrice' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get sales statistics by category
orderItemSchema.statics.getCategoryStats = function(startDate = null, endDate = null) {
  const match = { isActive: true };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          masterCategory: '$categoryInfo.masterCategory',
          subCategory: '$categoryInfo.subCategory',
          articleType: '$categoryInfo.articleType'
        },
        totalQuantity: { $sum: '$quantity' },
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$subPrice' },
        uniqueProducts: { $addToSet: '$productId' }
      }
    },
    {
      $project: {
        category: {
          masterCategory: '$_id.masterCategory',
          subCategory: '$_id.subCategory',
          articleType: '$_id.articleType'
        },
        totalQuantity: 1,
        totalOrders: 1,
        totalRevenue: 1,
        uniqueProductCount: { $size: '$uniqueProducts' }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

// Static method to get sales statistics by brand
orderItemSchema.statics.getBrandStats = function(startDate = null, endDate = null) {
  const match = { isActive: true };
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$brand',
        totalQuantity: { $sum: '$quantity' },
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$subPrice' },
        uniqueProducts: { $addToSet: '$productId' }
      }
    },
    {
      $project: {
        brand: '$_id',
        totalQuantity: 1,
        totalOrders: 1,
        totalRevenue: 1,
        uniqueProductCount: { $size: '$uniqueProducts' }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
};

// Pre-save middleware to calculate sub price
orderItemSchema.pre('save', function(next) {
  this.subPrice = this.price * this.quantity;
  next();
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
