const axios = require('axios');
const logger = require('../utils/logger');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'your-secret-service-token';

/**
 * User Service
 * Handles user authentication and validation
 */

/**
 * Validate if user exists and is authenticated
 * @param {string} userId - User ID to validate
 * @returns {Promise<Object|null>} - User object if valid, null otherwise
 */
async function validateUser(userId) {
  try {
    if (!userId || userId === 'anonymous') {
      return null;
    }

    // Development bypass: allow quick local testing without calling user-service
    if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
      const bypassList = (process.env.DEV_BYPASS_USERS || '').split(',').map(s => s.trim()).filter(Boolean);
      // If bypass enabled and user is in list (or list is empty = allow all)
      if (bypassList.length === 0 || bypassList.includes(userId)) {
        logger.info('User validation bypassed (dev mode)', { userId });
        // Return a mock user object for development
        return {
          _id: userId,
          email: `${userId}@test.local`,
          name: 'Test User',
          role: 'customer'
        };
      }
    }

    const response = await axios.get(
      `${USER_SERVICE_URL}/api/auth/internal/user/${userId}`,
      {
        headers: {
          'x-service-token': INTERNAL_SERVICE_TOKEN
        },
        timeout: 5000
      }
    );

    if (response.data?.success && response.data?.data?.user) {
      logger.info('User validated', { userId });
      return response.data.data.user;
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to validate user', { 
      error: error.message, 
      userId 
    });
    return null;
  }
}

/**
 * Get user details by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User details
 */
async function getUserById(userId) {
  try {
    const response = await axios.get(
      `${USER_SERVICE_URL}/api/auth/internal/user/${userId}`,
      {
        headers: {
          'x-service-token': INTERNAL_SERVICE_TOKEN
        },
        timeout: 5000
      }
    );

    if (response.data?.success && response.data?.data?.user) {
      return response.data.data.user;
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to get user by ID', { 
      error: error.message, 
      userId 
    });
    return null;
  }
}

/**
 * Validate user session/authentication
 * This checks if the user is actually logged in
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if authenticated, false otherwise
 */
async function isUserAuthenticated(userId) {
  if (!userId || userId === 'anonymous') {
    return false;
  }

  // Development bypass: allow quick local testing without calling user-service.
  // Enable by setting DEV_AUTH_BYPASS=true in .env. Optionally set DEV_BYPASS_USERS
  // to a comma-separated list of userIds to allow only specific test users.
  try {
    if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
      const bypassList = (process.env.DEV_BYPASS_USERS || '').split(',').map(s => s.trim()).filter(Boolean);
      // If no explicit list is provided, bypass authentication for any userId (use with care)
      if (bypassList.length === 0) return true;
      if (bypassList.includes(userId)) return true;
    }
  } catch (e) {
    // ignore and fall through to real validation
  }

  const user = await validateUser(userId);
  return !!user;
}

module.exports = {
  validateUser,
  getUserById,
  isUserAuthenticated
};
