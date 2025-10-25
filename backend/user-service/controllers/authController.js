const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Address = require('../models/Address');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Register new user
const register = async (req, res) => {
  try {

    const { name, email, password, dob, phoneNumber, gender, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      dob,
      phoneNumber,
      gender,
      role: role || 'Customer'
    });

    await user.save();

    // If user role is Customer, create customer profile
    if (user.role === 'Customer') {
      const customer = new Customer({
        userId: user._id,
        addresses: []  // Mảng rỗng ban đầu
      });
      await customer.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login user
const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'Active') {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Wrong email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let customer = null;
    // If user is a customer, also fetch customer details
    if (user.role === 'Customer') {
      customer = await Customer.findByUserId(user._id);
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        customer: customer
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {

    const { name, phoneNumber, avatar, dob, gender } = req.body;
    const userId = req.user.userId;

    const updateData = {};
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (dob) updateData.dob = dob;
    if (gender) updateData.gender = gender;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user by ID (for internal service calls)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let customer = null;
    // If user is a customer, also fetch customer details
    if (user.role === 'Customer') {
      customer = await Customer.findByUserId(user._id);
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        customer: customer
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Google OAuth callback handler
const googleCallback = async (req, res) => {
  try {
    // This function is called after successful Google authentication
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Google authentication failed'
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    // Redirect to frontend with token through API Gateway
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&success=true`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google callback error:', error);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?success=false&error=authentication_failed`;
    
    res.redirect(redirectUrl);
  }
};

// Google OAuth failure handler
const googleFailure = (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const redirectUrl = `${frontendUrl}/auth/callback?success=false&error=google_auth_failed`;
  
  res.redirect(redirectUrl);
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getUserById,
  googleCallback,
  googleFailure
};
