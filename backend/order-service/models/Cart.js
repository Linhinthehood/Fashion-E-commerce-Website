const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
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

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
cartSchema.index({ userId: 1 });
cartSchema.index({ isActive: 1 });

// Virtual for total items count
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for total price
cartSchema.virtual('totalPrice').get(function() {
  return this.items.reduce((total, item) => total + item.totalPrice, 0);
});

// Method to add item to cart
cartSchema.methods.addItem = function(item) {
  const existingItemIndex = this.items.findIndex(
    existingItem => 
      existingItem.productId.toString() === item.productId.toString() &&
      existingItem.variant.color === item.variant.color &&
      existingItem.variant.size === item.variant.size
  );

  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += item.quantity;
    this.items[existingItemIndex].totalPrice = 
      this.items[existingItemIndex].quantity * this.items[existingItemIndex].unitPrice;
  } else {
    // Add new item
    this.items.push(item);
  }

  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(productId, color, size) {
  this.items = this.items.filter(
    item => 
      !(item.productId.toString() === productId.toString() &&
        item.variant.color === color &&
        item.variant.size === size)
  );

  return this.save();
};

// Method to update item quantity
cartSchema.methods.updateItemQuantity = function(productId, color, size, quantity) {
  const item = this.items.find(
    item => 
      item.productId.toString() === productId.toString() &&
      item.variant.color === color &&
      item.variant.size === size
  );

  if (item) {
    if (quantity <= 0) {
      return this.removeItem(productId, color, size);
    } else {
      item.quantity = quantity;
      item.totalPrice = item.quantity * item.unitPrice;
      return this.save();
    }
  }

  return Promise.resolve(this);
};

// Method to clear cart
cartSchema.methods.clear = function() {
  this.items = [];
  return this.save();
};

// Method to check if item exists in cart
cartSchema.methods.hasItem = function(productId, color, size) {
  return this.items.some(
    item => 
      item.productId.toString() === productId.toString() &&
      item.variant.color === color &&
      item.variant.size === size
  );
};

// Method to get item from cart
cartSchema.methods.getItem = function(productId, color, size) {
  return this.items.find(
    item => 
      item.productId.toString() === productId.toString() &&
      item.variant.color === color &&
      item.variant.size === size
  );
};

// Static method to get or create cart for user
cartSchema.statics.getOrCreateCart = async function(userId) {
  let cart = await this.findOne({ userId, isActive: true });
  
  if (!cart) {
    cart = new this({ userId, items: [] });
    await cart.save();
  }
  
  return cart;
};

module.exports = mongoose.model('Cart', cartSchema);
