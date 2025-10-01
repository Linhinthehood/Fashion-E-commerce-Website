const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: mongoose.Types.ObjectId,
    unique: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    trim: true,
    maxlength: [20, 'Size cannot exceed 20 characters']
  },
  color: {
    type: [String],
    required: [true, 'Color is required'],
    validate: {
      validator: function(colors) {
        return colors && colors.length > 0;
      },
      message: 'At least one color must be specified'
    }
  },
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  images: {
    type: [String],
    default: [],
    validate: {
      validator: function(imgs) {
        return Array.isArray(imgs);
      },
      message: 'Images must be an array'
    }
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Active', 'Inactive'],
      message: 'Status must be either Active or Inactive'
    },
    default: 'Active'
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  sku: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true,
    sparse: true // Allows null values but ensures uniqueness when present
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
variantSchema.index({ productId: 1, status: 1 });
variantSchema.index({ size: 1, status: 1 });
variantSchema.index({ color: 1, status: 1 });
variantSchema.index({ stock: 1, status: 1 });
variantSchema.index({ sku: 1 }, { sparse: true });
variantSchema.index({ productId: 1, size: 1, color: 1 });

// Virtual for variant availability
variantSchema.virtual('isAvailable').get(function() {
  return this.status === 'Active' && this.stock > 0;
});

// Virtual for primary color (first color in array)
variantSchema.virtual('primaryColor').get(function() {
  return this.color && this.color.length > 0 ? this.color[0] : null;
});

// Virtual for primary image (first image in array)
variantSchema.virtual('primaryImage').get(function() {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

// Method to check if variant has specific color
variantSchema.methods.hasColor = function(color) {
  return this.color && this.color.includes(color);
};

// Method to check if variant is in stock
variantSchema.methods.isInStock = function() {
  return this.status === 'Active' && this.stock > 0;
};

// Method to update stock
variantSchema.methods.updateStock = function(quantity) {
  if (typeof quantity !== 'number') {
    throw new Error('Quantity must be a number');
  }
  
  const newStock = this.stock + quantity;
  if (newStock < 0) {
    throw new Error('Stock cannot be negative');
  }
  
  this.stock = newStock;
  return this.save();
};

// Method to reserve stock
variantSchema.methods.reserveStock = function(quantity) {
  if (quantity > this.stock) {
    throw new Error('Insufficient stock');
  }
  this.stock -= quantity;
  return this.save();
};

// Method to release stock
variantSchema.methods.releaseStock = function(quantity) {
  this.stock += quantity;
  return this.save();
};

// Static method to get variants by product
variantSchema.statics.getByProduct = function(productId, status = 'Active') {
  return this.find({ productId, status });
};

// Static method to get variants by size
variantSchema.statics.getBySize = function(size, status = 'Active') {
  return this.find({ size, status });
};

// Static method to get variants by color
variantSchema.statics.getByColor = function(color, status = 'Active') {
  return this.find({ color: color, status });
};

// Static method to get available variants (in stock)
variantSchema.statics.getAvailable = function() {
  return this.find({ status: 'Active', stock: { $gt: 0 } });
};

// Static method to get low stock variants
variantSchema.statics.getLowStock = function(threshold = 10) {
  return this.find({ 
    status: 'Active', 
    stock: { $gt: 0, $lte: threshold } 
  });
};

// Static method to get out of stock variants
variantSchema.statics.getOutOfStock = function() {
  return this.find({ 
    status: 'Active', 
    stock: 0 
  });
};

// Pre-save middleware to generate SKU if not provided
variantSchema.pre('save', function(next) {
  if (!this.sku && this.productId) {
    // Generate SKU based on product ID, size, and primary color
    const productIdShort = this.productId.toString().slice(-6);
    const sizeCode = this.size.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const colorCode = this.primaryColor ? this.primaryColor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : 'DEF';
    this.sku = `${productIdShort}-${sizeCode}-${colorCode}`;
  }
  next();
});

// Pre-remove middleware to handle variant deletion
variantSchema.pre('remove', async function(next) {
  // Could add logic here to handle inventory updates, order cancellations, etc.
  next();
});

module.exports = mongoose.model('Variant', variantSchema);
