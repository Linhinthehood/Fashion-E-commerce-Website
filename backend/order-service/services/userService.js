const axios = require('axios');

class UserService {
  constructor() {
    this.baseUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    this.serviceToken = process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-secret';
  }

  // Normalize axios/network errors to meaningful service errors
  normalizeAxiosError(error, details = '') {
    // If no response -> likely network error or service down
    if (!error.response) {
      const err = new Error(`User service unavailable${details ? `: ${details}` : ''}`);
      err.customStatus = 503;
      err.customCode = 'USER_SERVICE_UNAVAILABLE';
      return err;
    }
    // Has response -> propagate status/message
    const status = error.response.status;
    const message = error.response.data?.message || error.message || 'User service error';
    const err = new Error(message);
    err.customStatus = status;
    err.customCode = 'USER_SERVICE_ERROR';
    return err;
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/auth/internal/user/${userId}`, {
        headers: {
          'x-service-token': this.serviceToken
        }
      });
      return response.data.data.user;
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw this.normalizeAxiosError(error, `Failed to fetch user ${userId}`);
    }
  }

  // Get customer by user ID
  async getCustomerByUserId(userId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/customers/internal/user/${userId}`, {
        headers: {
          'x-service-token': this.serviceToken
        }
      });
      return response.data.data.customer;
    } catch (error) {
      console.error('Error fetching customer details:', error);
      throw this.normalizeAxiosError(error, `Failed to fetch customer for user ${userId}`);
    }
  }

  // Get customer address by ID
  async getAddressById(addressId, userId) {
    try {
      // Get customer profile with addresses populated
      const customer = await this.getCustomerByUserId(userId);
      
      if (!customer || !customer.addresses) {
        throw new Error('Customer profile or addresses not found');
      }
      
      // Find the specific address in the customer's addresses
      const address = customer.addresses.find(addr => addr._id.toString() === addressId);
      
      if (!address) {
        throw new Error(`Address ${addressId} not found in customer profile`);
      }
      
      return address;
    } catch (error) {
      // If error came from inner network call, it already normalized
      if (error.customStatus) {
        throw error;
      }
      console.error('Error fetching address details:', error);
      const err = new Error(`Failed to fetch address details for address ${addressId}`);
      err.customStatus = 400;
      err.customCode = 'ADDRESS_NOT_FOUND';
      throw err;
    }
  }

  // Validate user exists
  async validateUser(userId) {
    try {
      const user = await this.getUserById(userId);
      return !!user;
    } catch (error) {
      if (error.customStatus === 503) throw error; // bubble up service down
      return false;
    }
  }

  // Validate customer exists
  async validateCustomer(userId) {
    try {
      const customer = await this.getCustomerByUserId(userId);
      return !!customer;
    } catch (error) {
      if (error.customStatus === 503) throw error; // bubble up service down
      return false;
    }
  }

  // Validate address belongs to user
  async validateAddressOwnership(addressId, userId) {
    try {
      const address = await this.getAddressById(addressId, userId);
      return !!address;
    } catch (error) {
      if (error.customStatus === 503) throw error; // bubble up service down
      return false;
    }
  }
}

module.exports = new UserService();
