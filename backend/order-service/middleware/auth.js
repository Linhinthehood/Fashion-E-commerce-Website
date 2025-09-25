const jwt = require('jsonwebtoken');
const axios = require('axios');

// Verify JWT token by calling user service
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
      // Verify token with user service
      const response = await axios.get(
        `${process.env.USER_SERVICE_URL}/api/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        req.user = {
          userId: response.data.data.user._id,
          email: response.data.data.user.email,
          role: response.data.data.user.role
        };
        next();
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      throw error;
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
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

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
      const response = await axios.get(
        `${process.env.USER_SERVICE_URL}/api/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        req.user = {
          userId: response.data.data.user._id,
          email: response.data.data.user.email,
          role: response.data.data.user.role
        };
      } else {
        req.user = null;
      }
    } catch (error) {
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
  optionalAuth
};
