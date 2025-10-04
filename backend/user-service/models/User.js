const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Gender enum
const genderEnum = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHERS: 'Others'
};

// Role enum
const roleEnum = {
  MANAGER: 'Manager',
  STOCK_CLERK: 'Stock Clerk',
  CUSTOMER: 'Customer'
};

// User status enum
const statusEnum = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended'
};

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(date) {
        return date < new Date();
      },
      message: 'Date of birth must be in the past'
    }
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[0-9]{9,12}$/, 'Phone number must be 9 to 12 digits']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: {
      values: Object.values(genderEnum),
      message: 'Gender must be one of: Male, Female, Others'
    }
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: Object.values(roleEnum),
      message: 'Role must be one of: Manager, Stock Clerk, Customer'
    },
    default: roleEnum.CUSTOMER
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: Object.values(statusEnum),
      message: 'Status must be one of: Active, Inactive, Suspended'
    },
    default: statusEnum.ACTIVE
  },
  avatar: {
    type: String,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Export enums for use in other files
userSchema.statics.genderEnum = genderEnum;
userSchema.statics.roleEnum = roleEnum;
userSchema.statics.statusEnum = statusEnum;

module.exports = mongoose.model('User', userSchema);
