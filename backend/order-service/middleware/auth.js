const jwt = require('jsonwebtoken');
const axios = require('axios');

// Simple in-memory cache for userId -> customerId mapping
const customerIdCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Function to get customer ID from user ID with caching
const getCustomerIdFromUserId = async (userId) => {
  // Check cache first
  const cached = customerIdCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.customerId;
  }
  
  try {
    // Call user-service to get customer profile (only when cache miss)
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    const response = await axios.get(`${userServiceUrl}/api/customers/profile`, {
      headers: {
        'Authorization': `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}`
      }
    });
    
    const customer = response.data.data.customer;
    const customerId = customer ? customer._id : null;
    
    // Cache the result
    customerIdCache.set(userId, {
      customerId,
      timestamp: Date.now()
    });
    
    return customerId;
  } catch (error) {
    console.error('Error getting customer ID:', error);
    return null;
  }
};

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Check if user has required role
const authorize = (...roles) => {
  return async (req, res, next) => {
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
      
      // Get the original token from the request
      const authHeader = req.header('Authorization');
      const token = authHeader ? authHeader.substring(7) : null;
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }
      
      // Get user details from user service using the original token
      const response = await axios.get(`${userServiceUrl}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const user = response.data.data.user;
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      // Attach user details to request
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

// Check if user can access customer data (customer accessing own data or admin accessing any)
const canAccessCustomerData = async (req, res, next) => {
  try {
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    
    // Get the original token from the request
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.substring(7) : null;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    // Get user details from user service using the original token
    const response = await axios.get(`${userServiceUrl}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const user = response.data.data.user;
    
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
      // Get customer ID from user using the original token
      const customerResponse = await axios.get(`${userServiceUrl}/api/customers/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const customer = customerResponse.data.data.customer;
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer profile not found'
        });
      }
      
      // If there's a customerId in params, check if it matches the user's customer profile
      if (req.params.customerId && customer._id.toString() !== req.params.customerId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own data.'
        });
      }
      
      // Attach customer ID to request for easier access
      req.customerId = customer._id;
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

// Check if user can manage orders (customer managing own orders or admin managing any)
const canManageOrders = async (req, res, next) => {
  try {
    // Get the original token from the request
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.substring(7) : null;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    // Verify JWT token locally (no need to call user-service)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach decoded token info
    
    // For customer operations, we need to get customer ID
    // This should be stored in the JWT token payload or we need a lightweight way to get it
    // Option 1: Store customerId in JWT token during login
    // Option 2: Call user-service only once to get customer mapping (cache it)
    
    // For now, let's implement Option 2 with caching
    const customerId = await getCustomerIdFromUserId(decoded.userId);
    
    if (!customerId) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }
    
    // Attach customer ID to request
    req.customerId = customerId;
    next();
    
  } catch (error) {
    console.error('Order management access error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (jwtError) {
      req.user = null;
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  canAccessCustomerData,
  canManageOrders,
  optionalAuth
};