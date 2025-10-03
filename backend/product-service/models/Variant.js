const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
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
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
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
variantSchema.index({ stock: 1, status: 1 });
variantSchema.index({ sku: 1 }, { sparse: true });
variantSchema.index({ productId: 1, size: 1 });

// Virtual for variant availability
variantSchema.virtual('isAvailable').get(function() {
  return this.status === 'Active' && this.stock > 0;
});




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
    // Generate SKU based on product ID and size
    const productIdShort = this.productId.toString().slice(-6);
    const sizeCode = this.size.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    this.sku = `${productIdShort}-${sizeCode}`;
  }
  next();
});

// Pre-remove middleware to handle variant deletion
variantSchema.pre('remove', async function(next) {
  // Could add logic here to handle inventory updates, order cancellations, etc.
  next();
});

module.exports = mongoose.model('Variant', variantSchema);
