const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }],
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: [0, 'Loyalty points cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
customerSchema.index({ userId: 1 });
customerSchema.index({ addresses: 1 });

// Ensure virtual fields are serialized
customerSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to validate that the referenced user has Customer role
customerSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.userId);
      
      if (!user) {
        return next(new Error('Referenced user does not exist'));
      }
      
      if (user.role !== 'Customer') {
        return next(new Error('User must have Customer role to create customer profile'));
      }
      
      // Check if customer already exists for this user
      const existingCustomer = await mongoose.model('Customer').findOne({ userId: this.userId });
      if (existingCustomer) {
        return next(new Error('Customer profile already exists for this user'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Static method to get customer by userId
customerSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('userId', 'name email phoneNumber').populate('addresses');
};

// Static method to get customers with user details
customerSchema.statics.findWithUserDetails = function(filter = {}) {
  return this.find(filter).populate('userId', 'name email phoneNumber gender dob avatar status').populate('addresses');
};

module.exports = mongoose.model('Customer', customerSchema);
