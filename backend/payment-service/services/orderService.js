const axios = require('axios');

class OrderService {
  constructor(orderServiceUrl, internalToken) {
    this.baseURL = orderServiceUrl;
    this.internalToken = internalToken;
  }

  /**
   * Get order by ID
   * @param {String} orderId - Order ID
   * @returns {Object} - Order data
   */
  async getOrderById(orderId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${this.internalToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        return response.data.data.order;
      }

      throw new Error(response.data.message || 'Failed to get order');
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Order service error');
      }
      throw error;
    }
  }

  /**
   * Update order payment status
   * @param {String} orderId - Order ID
   * @param {String} status - Payment status (Paid, Failed, etc.)
   * @returns {Object} - Updated order data
   */
  async updatePaymentStatus(orderId, status) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/api/orders/${orderId}/payment-status`,
        { status },
        {
          headers: {
            'Authorization': `Bearer ${this.internalToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        return response.data.data.order;
      }

      throw new Error(response.data.message || 'Failed to update payment status');
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || 'Order service error');
      }
      throw error;
    }
  }

  /**
   * Validate order exists and belongs to user
   * @param {String} orderId - Order ID
   * @param {String} userId - User ID
   * @returns {Boolean} - True if order is valid
   */
  async validateOrder(orderId, userId) {
    try {
      const order = await this.getOrderById(orderId);
      return order && order.userId.toString() === userId.toString();
    } catch (error) {
      return false;
    }
  }
}

module.exports = OrderService;

