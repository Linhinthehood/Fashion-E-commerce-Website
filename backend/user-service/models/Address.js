const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Address name is required'],
    trim: true,
    maxlength: [100, 'Address name cannot exceed 100 characters']
  },
  addressInfo: {
    type: String,
    required: [true, 'Address info is required'],
    trim: true,
    maxlength: [500, 'Address info cannot exceed 500 characters']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
addressSchema.index({ name: 1 });
addressSchema.index({ isDefault: 1 });

module.exports = mongoose.model('Address', addressSchema);
