const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId(),
    unique: true
  },
  masterCategory: {
    type: String,
    required: [true, 'Master category is required'],
    trim: true,
    maxlength: [100, 'Master category cannot exceed 100 characters']
  },
  subCategory: {
    type: String,
    required: [true, 'Sub category is required'],
    trim: true,
    maxlength: [100, 'Sub category cannot exceed 100 characters']
  },
  articleType: {
    type: String,
    required: [true, 'Article type is required'],
    trim: true,
    maxlength: [100, 'Article type cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  productCount: {
    type: Number,
    default: 0,
    min: [0, 'Product count cannot be negative']
  }
}, {
  timestamps: true
});

// Indexes
categorySchema.index({ masterCategory: 1, subCategory: 1, articleType: 1 });
categorySchema.index({ masterCategory: 1, isActive: 1 });
categorySchema.index({ subCategory: 1, isActive: 1 });
categorySchema.index({ articleType: 1, isActive: 1 });

// Virtual for category hierarchy path
categorySchema.virtual('path').get(function() {
  return `${this.masterCategory} > ${this.subCategory} > ${this.articleType}`;
});

// Virtual for full category name
categorySchema.virtual('fullName').get(function() {
  return `${this.masterCategory} - ${this.subCategory} - ${this.articleType}`;
});

// Method to get all products in this category
categorySchema.methods.getAllProducts = async function() {
  const Product = mongoose.model('Product');
  return Product.find({ categoryId: this._id, isActive: true });
};

// Static method to get categories by master category
categorySchema.statics.getByMasterCategory = function(masterCategory) {
  return this.find({ masterCategory, isActive: true })
    .sort({ subCategory: 1, articleType: 1 });
};

// Static method to get categories by sub category
categorySchema.statics.getBySubCategory = function(subCategory) {
  return this.find({ subCategory, isActive: true })
    .sort({ masterCategory: 1, articleType: 1 });
};

// Static method to get all master categories
categorySchema.statics.getMasterCategories = function() {
  return this.distinct('masterCategory', { isActive: true });
};

// Static method to get all sub categories
categorySchema.statics.getSubCategories = function(masterCategory = null) {
  const query = { isActive: true };
  if (masterCategory) query.masterCategory = masterCategory;
  return this.distinct('subCategory', query);
};

// Static method to get all article types
categorySchema.statics.getArticleTypes = function(masterCategory = null, subCategory = null) {
  const query = { isActive: true };
  if (masterCategory) query.masterCategory = masterCategory;
  if (subCategory) query.subCategory = subCategory;
  return this.distinct('articleType', query);
};

// Pre-save middleware to update product count
categorySchema.pre('save', async function(next) {
  if (this.isModified('isActive')) {
    const Product = mongoose.model('Product');
    this.productCount = await Product.countDocuments({ 
      categoryId: this._id, 
      isActive: true 
    });
  }
  next();
});

// Pre-remove middleware to handle category deletion
categorySchema.pre('remove', async function(next) {
  const Product = mongoose.model('Product');
  
  // Mark products as inactive when category is deleted
  await Product.updateMany(
    { categoryId: this._id },
    { isActive: false }
  );
  
  next();
});

module.exports = mongoose.model('Category', categorySchema);
