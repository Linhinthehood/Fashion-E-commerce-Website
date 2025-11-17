const axios = require('axios');

class UserService {
  constructor() {
    this.baseUrl = process.env.USER_SERVICE_URL;
    this.serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
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
      const url = `${this.baseUrl}/api/auth/internal/user/${userId}`;
      console.log(`[UserService] Fetching user ${userId} from ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'x-service-token': this.serviceToken
        }
      });
      
      console.log(`[UserService] Response for user ${userId}:`, {
        success: response.data?.success,
        hasData: !!response.data?.data,
        hasUser: !!response.data?.data?.user,
        userKeys: response.data?.data?.user ? Object.keys(response.data.data.user) : []
      });
      
      if (!response.data || !response.data.success) {
        throw new Error(`User service returned unsuccessful response: ${JSON.stringify(response.data)}`);
      }
      
      if (!response.data.data || !response.data.data.user) {
        console.warn(`[UserService] User ${userId} not found in response:`, response.data);
        return null;
      }
      
      return response.data.data.user;
    } catch (error) {
      console.error(`[UserService] Error fetching user ${userId}:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      throw this.normalizeAxiosError(error, `Failed to fetch user ${userId}`);
    }
  }

  // Get customer by user ID
  async getCustomerByUserId(userId) {
    try {
      const url = `${this.baseUrl}/api/customers/internal/user/${userId}`;
      console.log(`[UserService] Fetching customer for user ${userId} from ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'x-service-token': this.serviceToken
        }
      });
      
      const customer = response.data.data.customer;
      console.log(`[UserService] Customer fetched:`, {
        hasCustomer: !!customer,
        hasAddresses: !!(customer && customer.addresses),
        addressesCount: customer?.addresses?.length || 0,
        addressesSample: customer?.addresses?.slice(0, 2).map(addr => {
          if (typeof addr === 'object' && addr._id) {
            return { id: addr._id.toString(), name: addr.name };
          }
          return { id: addr.toString() };
        }) || []
      });
      
      return customer;
    } catch (error) {
      console.error('[UserService] Error fetching customer details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      throw this.normalizeAxiosError(error, `Failed to fetch customer for user ${userId}`);
    }
  }

  // Get customer address by ID
  async getAddressById(addressId, userId) {
    try {
      console.log(`[UserService] Fetching address ${addressId} for user ${userId}`);
      
      // Get customer profile with addresses populated
      const customer = await this.getCustomerByUserId(userId);
      
      console.log(`[UserService] Customer fetched:`, {
        hasCustomer: !!customer,
        hasAddresses: !!(customer && customer.addresses),
        addressesCount: customer?.addresses?.length || 0,
        addressesType: customer?.addresses ? (Array.isArray(customer.addresses) ? 'array' : typeof customer.addresses) : 'none'
      });
      
      if (!customer) {
        throw new Error('Customer profile not found');
      }
      
      if (!customer.addresses || !Array.isArray(customer.addresses) || customer.addresses.length === 0) {
        console.warn(`[UserService] Customer has no addresses. Addresses:`, customer.addresses);
        throw new Error('Customer has no addresses');
      }
      
      // Normalize addressId to string for comparison
      const addressIdStr = addressId.toString();
      console.log(`[UserService] Looking for address with ID: ${addressIdStr}`);
      console.log(`[UserService] Available address IDs:`, customer.addresses.map(addr => {
        if (typeof addr === 'object' && addr._id) {
          return addr._id.toString();
        }
        return addr.toString();
      }));
      
      // Find the specific address in the customer's addresses
      // Handle both populated (object with _id) and non-populated (just ObjectId) cases
      const address = customer.addresses.find(addr => {
        if (typeof addr === 'object' && addr._id) {
          return addr._id.toString() === addressIdStr;
        }
        return addr.toString() === addressIdStr;
      });
      
      if (!address) {
        console.error(`[UserService] Address ${addressIdStr} not found in customer's addresses`);
        throw new Error(`Address ${addressIdStr} not found in customer profile`);
      }
      
      // If address is just an ObjectId (not populated), we need to fetch it separately
      // But since findByUserId already populates addresses, this shouldn't happen
      if (typeof address === 'object' && address._id && address.name && address.addressInfo) {
        console.log(`[UserService] Address found:`, { name: address.name, addressInfo: address.addressInfo });
        return address;
      }
      
      // If somehow address is not fully populated, throw error
      throw new Error(`Address ${addressIdStr} found but not properly populated`);
    } catch (error) {
      // If error came from inner network call, it already normalized
      if (error.customStatus) {
        throw error;
      }
      console.error('[UserService] Error fetching address details:', error.message);
      console.error('[UserService] Error stack:', error.stack);
      const err = new Error(`Failed to fetch address details for address ${addressId}: ${error.message}`);
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

  async addLoyaltyPoints(userId, points) {
    try {
      const headers = {};
      if (this.serviceToken) {
        headers['x-service-token'] = this.serviceToken;
      }

      const response = await axios.post(
        `${this.baseUrl}/api/customers/internal/user/${userId}/loyalty-points`,
        {
          points,
          operation: 'add'
        },
        { headers }
      );

      return response.data.data?.customer;
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      throw this.normalizeAxiosError(error, `Failed to add loyalty points for user ${userId}`);
    }
  }
}

module.exports = new UserService();
