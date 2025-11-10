const axios = require('axios');

const FASHION_SERVICE_URL = process.env.FASHION_SERVICE_URL || 'http://localhost:3008';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

/**
 * Get personalized recommendations for a user
 */
async function getPersonalizedRecommendations(userId, limit = 8) {
  try {
    const response = await axios.post(
      `${FASHION_SERVICE_URL}/api/recommendations/retrieve/personalized`,
      {
        recentItemIds: [], // Will use user's history from localStorage
        limit,
        options: {
          userId,
          embeddingWeight: 0.3,
          popularityWeight: 0.2,
          affinityWeight: 0.5
        }
      },
      { timeout: 10000 }
    );

    if (response.data?.candidates) {
      return response.data.candidates.map(c => c.product);
    }
    return [];
  } catch (error) {
    console.error('Failed to get recommendations:', error.message);
    return [];
  }
}

/**
 * Search products by filters
 */
async function searchProducts(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('categoryId', filters.category);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.color) params.append('color', filters.color);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await axios.get(
      `${PRODUCT_SERVICE_URL}/api/products?${params.toString()}`,
      { timeout: 5000 }
    );

    if (response.data?.success && response.data?.data?.products) {
      return response.data.data.products;
    }
    return [];
  } catch (error) {
    console.error('Failed to search products:', error.message);
    return [];
  }
}

/**
 * Get product details by ID
 */
async function getProductById(productId) {
  try {
    const response = await axios.get(
      `${PRODUCT_SERVICE_URL}/api/products/${productId}`,
      { timeout: 5000 }
    );

    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('Failed to get product:', error.message);
    return null;
  }
}

/**
 * Get similar products using FashionCLIP
 */
async function getSimilarProducts(productId, limit = 8) {
  try {
    const response = await axios.get(
      `${FASHION_SERVICE_URL}/api/recommendations/product/${productId}?limit=${limit}`,
      { timeout: 10000 }
    );

    if (response.data?.recommendations) {
      return response.data.recommendations.map(r => r.product);
    }
    return [];
  } catch (error) {
    console.error('Failed to get similar products:', error.message);
    return [];
  }
}

module.exports = {
  getPersonalizedRecommendations,
  searchProducts,
  getProductById,
  getSimilarProducts
};
