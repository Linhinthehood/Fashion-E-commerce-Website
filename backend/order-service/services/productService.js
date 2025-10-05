const axios = require('axios');

class ProductService {
  constructor() {
    this.baseUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
  }

  // Normalize axios/network errors to meaningful service errors
  normalizeAxiosError(error, details = '') {
    if (!error.response) {
      const err = new Error(`Product service unavailable${details ? `: ${details}` : ''}`);
      err.customStatus = 503;
      err.customCode = 'PRODUCT_SERVICE_UNAVAILABLE';
      return err;
    }
    const status = error.response.status;
    const message = error.response.data?.message || error.message || 'Product service error';
    const err = new Error(message);
    err.customStatus = status;
    err.customCode = 'PRODUCT_SERVICE_ERROR';
    return err;
  }

  // Get product by ID
  async getProductById(productId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/products/${productId}`);
      return response.data.data.product;
    } catch (error) {
      console.error('Error fetching product details:', error);
      throw this.normalizeAxiosError(error, `Failed to fetch product ${productId}`);
    }
  }

  // Get variant by ID
  async getVariantById(variantId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/variants/${variantId}`);
      return response.data.data.variant;
    } catch (error) {
      console.error('Error fetching variant details:', error);
      throw this.normalizeAxiosError(error, `Failed to fetch variant ${variantId}`);
    }
  }

  // Check if variant has enough stock
  async checkStock(variantId, quantity) {
    try {
      const variant = await this.getVariantById(variantId);
      return variant.stock >= quantity;
    } catch (error) {
      if (error.customStatus === 503) throw error;
      console.error('Error checking stock:', error);
      return false;
    }
  }

  // Get product with primary image only
  async getProductWithPrimaryImage(productId) {
    try {
      const product = await this.getProductById(productId);
      
      // Return only the first image as primary
      const productWithPrimaryImage = {
        ...product,
        images: product.images && product.images.length > 0 ? [product.images[0]] : []
      };
      
      return productWithPrimaryImage;
    } catch (error) {
      console.error('Error fetching product with primary image:', error);
      throw new Error(`Failed to fetch product with primary image for product ${productId}`);
    }
  }
}

module.exports = new ProductService();
