const User = require('../models/User');

// Check if user has specific role(s)
const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${roles.join(', ')}`
        });
      }

      // Attach user object to request for use in controllers
      req.userDetails = user;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Check if user is a customer
const requireCustomer = requireRole('Customer');

// Check if user is admin/manager (Manager or Stock Clerk)
const requireAdmin = requireRole('Manager', 'Stock Clerk');

// Check if user is manager only
const requireManager = requireRole('Manager');

// Check if user is stock clerk only
const requireStockClerk = requireRole('Stock Clerk');

// Check if user can access customer data (customer accessing own data or admin accessing any)
const canAccessCustomerData = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Admin/Manager can access any customer data
    if (['Manager', 'Stock Clerk'].includes(user.role)) {
      req.userDetails = user;
      return next();
    }

    // Customer can only access their own data
    if (user.role === 'Customer') {
      // If there's a customerId in params, check if it matches the user's customer profile
      if (req.params.customerId) {
        const Customer = require('../models/Customer');
        const customer = await Customer.findOne({ userId: user._id });
        
        if (!customer || customer._id.toString() !== req.params.customerId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own data.'
          });
        }
      }
      
      req.userDetails = user;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Insufficient permissions.'
    });
  } catch (error) {
    console.error('Customer data access error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Check if user can manage addresses (customer managing own addresses)
const canManageAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only customers can manage their own addresses
    if (user.role !== 'Customer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only customers can manage addresses.'
      });
    }

    // If there's an addressId in params, verify ownership
    if (req.params.addressId) {
      const Customer = require('../models/Customer');
      const customer = await Customer.findOne({ userId: user._id });
      
      if (!customer || !customer.addresses.includes(req.params.addressId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only manage your own addresses.'
        });
      }
    }

    req.userDetails = user;
    next();
  } catch (error) {
    console.error('Address management access error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  requireRole,
  requireCustomer,
  requireAdmin,
  requireManager,
  requireStockClerk,
  canAccessCustomerData,
  canManageAddresses
};
