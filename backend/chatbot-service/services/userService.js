const axios = require('axios');
const logger = require('../utils/logger');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// Validate token is set (security)
if (!INTERNAL_SERVICE_TOKEN || INTERNAL_SERVICE_TOKEN === 'your-secret-service-token') {
  logger.error('⚠️  SECURITY WARNING: INTERNAL_SERVICE_TOKEN must be set to a secure value in .env');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('INTERNAL_SERVICE_TOKEN not configured for production');
  }
}

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

    // SECURITY: Development bypass removed - always validate users
    // If you need to test locally, use a real user from your database

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

  // SECURITY: Always validate - no bypasses
  const user = await validateUser(userId);
  return !!user;
}

module.exports = {
  validateUser,
  getUserById,
  isUserAuthenticated
};
