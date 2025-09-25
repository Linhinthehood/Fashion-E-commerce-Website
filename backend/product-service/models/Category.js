const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    url: String,
    alt: String
  },
  icon: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  seo: {
    title: String,
    description: String,
    keywords: [String]
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
categorySchema.index({ name: 1, isActive: 1 });
categorySchema.index({ parent: 1, isActive: 1 });
categorySchema.index({ sortOrder: 1, isActive: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual for full path
categorySchema.virtual('path').get(function() {
  if (this.parent) {
    return `${this.parent.name} > ${this.name}`;
  }
  return this.name;
});

// Method to get all subcategories recursively
categorySchema.methods.getAllSubcategories = async function() {
  const subcategories = await this.constructor.find({ parent: this._id, isActive: true });
  let allSubcategories = [...subcategories];
  
  for (const subcategory of subcategories) {
    const nestedSubcategories = await subcategory.getAllSubcategories();
    allSubcategories = allSubcategories.concat(nestedSubcategories);
  }
  
  return allSubcategories;
};

// Method to get all products in this category and subcategories
categorySchema.methods.getAllProducts = async function() {
  const Product = mongoose.model('Product');
  const subcategories = await this.getAllSubcategories();
  const categoryIds = [this._id, ...subcategories.map(sub => sub._id)];
  
  return Product.find({ category: { $in: categoryIds }, isActive: true });
};

// Static method to get root categories
categorySchema.statics.getRootCategories = function() {
  return this.find({ parent: null, isActive: true })
    .sort({ sortOrder: 1, name: 1 });
};

// Static method to get category tree
categorySchema.statics.getCategoryTree = async function() {
  const rootCategories = await this.getRootCategories();
  
  const buildTree = async (categories) => {
    const tree = [];
    
    for (const category of categories) {
      const subcategories = await this.find({ parent: category._id, isActive: true })
        .sort({ sortOrder: 1, name: 1 });
      
      const categoryObj = category.toObject();
      if (subcategories.length > 0) {
        categoryObj.subcategories = await buildTree(subcategories);
      } else {
        categoryObj.subcategories = [];
      }
      
      tree.push(categoryObj);
    }
    
    return tree;
  };
  
  return buildTree(rootCategories);
};

// Pre-save middleware to update product count
categorySchema.pre('save', async function(next) {
  if (this.isModified('isActive')) {
    const Product = mongoose.model('Product');
    this.productCount = await Product.countDocuments({ 
      category: this._id, 
      isActive: true 
    });
  }
  next();
});

// Pre-remove middleware to handle category deletion
categorySchema.pre('remove', async function(next) {
  const Product = mongoose.model('Product');
  
  // Move products to parent category or mark as inactive
  const products = await Product.find({ category: this._id });
  
  if (this.parent) {
    // Move to parent category
    await Product.updateMany(
      { category: this._id },
      { category: this.parent }
    );
  } else {
    // Mark products as inactive
    await Product.updateMany(
      { category: this._id },
      { isActive: false }
    );
  }
  
  // Move subcategories to parent or mark as inactive
  const subcategories = await this.constructor.find({ parent: this._id });
  
  if (this.parent) {
    await this.constructor.updateMany(
      { parent: this._id },
      { parent: this.parent }
    );
  } else {
    await this.constructor.updateMany(
      { parent: this._id },
      { isActive: false }
    );
  }
  
  next();
});

module.exports = mongoose.model('Category', categorySchema);
