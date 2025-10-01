const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    default: mongoose.Types.ObjectId,
    unique: true
  },
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
  brand: {
    type: String,
    required: [true, 'Product brand is required'],
    trim: true,
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: {
      values: ['Male', 'Female', 'Unisex'],
      message: 'Gender must be one of: Male, Female, Unisex'
    }
  },
  season: {
    type: String,
    required: [true, 'Season is required'],
    enum: {
      values: ['Spring/Summer', 'Fall/Winter'],
      message: 'Season must be one of: Spring/Summer, Fall/Winter'
    }
  },
  usage: {
    type: String,
    required: [true, 'Usage is required'],
    trim: true,
    maxlength: [100, 'Usage cannot exceed 100 characters']
  },
  hasImage: {
    type: Boolean,
    default: false
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ brand: 1, isActive: 1 });
productSchema.index({ gender: 1, isActive: 1 });
productSchema.index({ season: 1, isActive: 1 });
productSchema.index({ createdAt: -1, isActive: 1 });
productSchema.index({ brand: 1, gender: 1, season: 1 });

// Virtual for total stock (from variants)
productSchema.virtual('totalStock', {
  ref: 'Variant',
  localField: '_id',
  foreignField: 'productId',
  options: { match: { status: 'Active' } }
}).get(function() {
  if (this.variants) {
    return this.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  return 0;
});

// Method to get all variants for this product
productSchema.methods.getVariants = async function() {
  const Variant = mongoose.model('Variant');
  return Variant.find({ productId: this._id, status: 'Active' });
};

// Method to check if product has any active variants
productSchema.methods.hasActiveVariants = async function() {
  const Variant = mongoose.model('Variant');
  const count = await Variant.countDocuments({ productId: this._id, status: 'Active' });
  return count > 0;
};

// Static method to get products by category
productSchema.statics.getByCategory = function(categoryId, limit = 20) {
  return this.find({ categoryId, isActive: true })
    .populate('categoryId', 'masterCategory subCategory articleType')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get products by brand
productSchema.statics.getByBrand = function(brand, limit = 20) {
  return this.find({ brand: new RegExp(brand, 'i'), isActive: true })
    .populate('categoryId', 'masterCategory subCategory articleType')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get products by gender
productSchema.statics.getByGender = function(gender, limit = 20) {
  return this.find({ gender, isActive: true })
    .populate('categoryId', 'masterCategory subCategory articleType')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get products by season
productSchema.statics.getBySeason = function(season, limit = 20) {
  return this.find({ season, isActive: true })
    .populate('categoryId', 'masterCategory subCategory articleType')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search products
productSchema.statics.search = function(query, filters = {}) {
  const searchQuery = {
    isActive: true,
    $text: { $search: query }
  };

  // Apply filters
  if (filters.categoryId) searchQuery.categoryId = filters.categoryId;
  if (filters.brand) searchQuery.brand = new RegExp(filters.brand, 'i');
  if (filters.gender) searchQuery.gender = filters.gender;
  if (filters.season) searchQuery.season = filters.season;

  return this.find(searchQuery)
    .populate('categoryId', 'masterCategory subCategory articleType')
    .sort({ score: { $meta: 'textScore' }, createdAt: -1 });
};

// Static method to get products with variants
productSchema.statics.getWithVariants = function(limit = 20) {
  return this.find({ isActive: true })
    .populate('categoryId', 'masterCategory subCategory articleType')
    .populate({
      path: 'variants',
      model: 'Variant',
      match: { status: 'Active' }
    })
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Product', productSchema);
