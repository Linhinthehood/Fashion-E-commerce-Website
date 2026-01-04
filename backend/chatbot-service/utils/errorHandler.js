/**
 * Error Handler Utility
 * Provides user-friendly error messages
 */

/**
 * Get user-friendly error message
 * @param {Error} error - Original error
 * @param {string} context - Context (e.g., 'product-search', 'gemini-api')
 * @returns {string} - User-friendly message
 */
function getUserFriendlyMessage(error, context) {
  const errorMessages = {
    'product-search': {
      'ECONNREFUSED': 'Our product catalog is temporarily unavailable. Please try again in a moment.',
      'ETIMEDOUT': 'Product search is taking longer than expected. Please try again.',
      'default': 'We\'re having trouble finding products right now. Please try again shortly.'
    },
    'gemini-api': {
      'API_KEY_INVALID': 'Our AI assistant is not configured correctly. Please contact support.',
      'RATE_LIMIT': 'Our AI is getting too many requests. Please wait a moment and try again.',
      '429': 'Our AI is busy right now. Please wait a few seconds and try again.',
      'default': 'Our AI assistant is temporarily unavailable. Please try again shortly.'
    },
    'user-auth': {
      'ECONNREFUSED': 'Authentication service is unavailable. Please try again.',
      '401': 'Your session has expired. Please log in again.',
      '403': 'You don\'t have permission to access this.',
      'default': 'We couldn\'t verify your login. Please try signing in again.'
    },
    'order-service': {
      'ECONNREFUSED': 'Order service is temporarily unavailable. Please try again.',
      'ETIMEDOUT': 'Loading orders is taking longer than expected. Please try again.',
      'default': 'We\'re having trouble loading your orders. Please try again shortly.'
    }
  };

  const contextMessages = errorMessages[context] || {};
  const errorCode = error.code || error.response?.status?.toString() || 'default';

  return contextMessages[errorCode] || contextMessages['default'] || 'Something went wrong. Please try again.';
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms
 * @returns {Promise} - Result of function
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // 5xx server errors
  if (error.response && error.response.status >= 500) {
    return true;
  }

  // Too many requests
  if (error.response && error.response.status === 429) {
    return true;
  }

  return false;
}

module.exports = {
  getUserFriendlyMessage,
  retryWithBackoff,
  isRetryableError
};
