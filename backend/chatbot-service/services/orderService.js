const axios = require('axios');
const logger = require('../utils/logger');

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';

/**
 * Order Service
 * Handles order-related queries for the chatbot
 */

/**
 * Get user's orders with optional filters
 * @param {string} userId - User ID
 * @param {Object} filters - Optional filters (paymentStatus, shipmentStatus, page, limit)
 * @returns {Promise<Array>} - Array of orders
 */
async function getUserOrders(userId, filters = {}) {
  try {
    const { page = 1, limit = 10, paymentStatus, shipmentStatus } = filters;
    
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (paymentStatus) params.append('paymentStatus', paymentStatus);
    if (shipmentStatus) params.append('shipmentStatus', shipmentStatus);

    const response = await axios.post(
      `${ORDER_SERVICE_URL}/api/orders/my-orders?${params.toString()}`,
      { userId },
      { timeout: 5000 }
    );

    if (response.data?.success && response.data?.data?.orders) {
      logger.info('Fetched user orders', { 
        userId, 
        orderCount: response.data.data.orders.length 
      });
      return response.data.data.orders;
    }
    
    return [];
  } catch (error) {
    logger.error('Failed to get user orders', { 
      error: error.message, 
      userId 
    });
    return [];
  }
}

/**
 * Get specific order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} - Order details with items
 */
async function getOrderById(orderId) {
  try {
    const response = await axios.get(
      `${ORDER_SERVICE_URL}/api/orders/${orderId}`,
      { timeout: 5000 }
    );

    if (response.data?.success && response.data?.data) {
      logger.info('Fetched order details', { orderId });
      return response.data.data;
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to get order by ID', { 
      error: error.message, 
      orderId 
    });
    return null;
  }
}

/**
 * Get user's order statistics
 * @param {string} userId - User ID
 * @param {Object} dateRange - Optional date range (startDate, endDate)
 * @returns {Promise<Object|null>} - Order statistics
 */
async function getOrderStats(userId, dateRange = {}) {
  try {
    const { startDate, endDate } = dateRange;
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await axios.post(
      `${ORDER_SERVICE_URL}/api/orders/stats?${params.toString()}`,
      { userId },
      { timeout: 5000 }
    );

    if (response.data?.success && response.data?.data) {
      logger.info('Fetched order stats', { userId });
      return response.data.data;
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to get order stats', { 
      error: error.message, 
      userId 
    });
    return null;
  }
}

/**
 * Get recent orders (last N orders)
 * @param {string} userId - User ID
 * @param {number} limit - Number of orders to fetch
 * @returns {Promise<Array>} - Array of recent orders
 */
async function getRecentOrders(userId, limit = 5) {
  try {
    return await getUserOrders(userId, { page: 1, limit });
  } catch (error) {
    logger.error('Failed to get recent orders', { 
      error: error.message, 
      userId 
    });
    return [];
  }
}

/**
 * Get orders by status
 * @param {string} userId - User ID
 * @param {string} status - Status type ('payment' or 'shipment')
 * @param {string} statusValue - Status value
 * @returns {Promise<Array>} - Array of orders
 */
async function getOrdersByStatus(userId, status, statusValue) {
  try {
    const filters = { limit: 20 };
    
    if (status === 'payment') {
      filters.paymentStatus = statusValue;
    } else if (status === 'shipment') {
      filters.shipmentStatus = statusValue;
    }
    
    return await getUserOrders(userId, filters);
  } catch (error) {
    logger.error('Failed to get orders by status', { 
      error: error.message, 
      userId,
      status,
      statusValue
    });
    return [];
  }
}

module.exports = {
  getUserOrders,
  getOrderById,
  getOrderStats,
  getRecentOrders,
  getOrdersByStatus
};
