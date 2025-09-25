const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  brand: {
    type: String,
    required: [true, 'Product brand is required'],
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  variants: [{
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
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    price: {
      type: Number,
      min: [0, 'Variant price cannot be negative']
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  specifications: {
    material: String,
    care: String,
    origin: String,
    weight: String,
    dimensions: String
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isNew: {
    type: Boolean,
    default: true
  },
  discount: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },
  salesCount: {
    type: Number,
    default: 0,
    min: [0, 'Sales count cannot be negative']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ 'rating.average': -1, isActive: 1 });
productSchema.index({ createdAt: -1, isActive: 1 });
productSchema.index({ salesCount: -1, isActive: 1 });

// Virtual for total stock
productSchema.virtual('totalStock').get(function() {
  return this.variants.reduce((total, variant) => total + variant.stock, 0);
});

// Virtual for primary image
productSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : (this.images[0] ? this.images[0].url : null);
});

// Virtual for discount price
productSchema.virtual('discountPrice').get(function() {
  if (this.discount > 0) {
    return this.price * (1 - this.discount / 100);
  }
  return this.price;
});

// Method to check if product is in stock
productSchema.methods.isInStock = function(color, size) {
  if (!color || !size) return this.totalStock > 0;
  
  const variant = this.variants.find(v => 
    v.color.toLowerCase() === color.toLowerCase() && 
    v.size.toLowerCase() === size.toLowerCase()
  );
  
  return variant ? variant.stock > 0 : false;
};

// Method to get variant by color and size
productSchema.methods.getVariant = function(color, size) {
  return this.variants.find(v => 
    v.color.toLowerCase() === color.toLowerCase() && 
    v.size.toLowerCase() === size.toLowerCase()
  );
};

// Method to update stock
productSchema.methods.updateStock = function(color, size, quantity) {
  const variant = this.getVariant(color, size);
  if (variant) {
    variant.stock = Math.max(0, variant.stock + quantity);
    return this.save();
  }
  throw new Error('Variant not found');
};

// Static method to get featured products
productSchema.statics.getFeatured = function(limit = 10) {
  return this.find({ isActive: true, isFeatured: true })
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get new products
productSchema.statics.getNew = function(limit = 10) {
  return this.find({ isActive: true, isNew: true })
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get best sellers
productSchema.statics.getBestSellers = function(limit = 10) {
  return this.find({ isActive: true })
    .populate('category', 'name')
    .sort({ salesCount: -1 })
    .limit(limit);
};

// Static method to search products
productSchema.statics.search = function(query, filters = {}) {
  const searchQuery = {
    isActive: true,
    $text: { $search: query }
  };

  // Apply filters
  if (filters.category) searchQuery.category = filters.category;
  if (filters.brand) searchQuery.brand = new RegExp(filters.brand, 'i');
  if (filters.minPrice || filters.maxPrice) {
    searchQuery.price = {};
    if (filters.minPrice) searchQuery.price.$gte = filters.minPrice;
    if (filters.maxPrice) searchQuery.price.$lte = filters.maxPrice;
  }
  if (filters.tags && filters.tags.length > 0) {
    searchQuery.tags = { $in: filters.tags };
  }

  return this.find(searchQuery)
    .populate('category', 'name')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
};

module.exports = mongoose.model('Product', productSchema);
