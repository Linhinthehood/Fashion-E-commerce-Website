const axios = require('axios');
const logger = require('../utils/logger');

const FASHION_SERVICE_URL = process.env.FASHION_SERVICE_URL || 'http://localhost:3008';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

/**
 * Product Service
 * 
 * This service handles product search and recommendations.
 * 
 * SEARCH FLOW:
 * 1. Extract search filters (category, articleType, brand, color, gender)
 * 2. Query categories from database to resolve categoryId
 * 3. Match filters against database categories (singular/plural aware)
 * 4. Query products using resolved categoryId + other filters
 * 5. Return products to chatbot
 * 
 * CATEGORY MATCHING:
 * - Priority 1: articleType (most specific) - e.g., "Shirt", "Watch"
 * - Priority 2: masterCategory/subCategory (broader) - e.g., "Apparel", "Accessories"
 * - Smart matching handles plural/singular variations (Shirts → Shirt)
 * 
 * DATABASE STRUCTURE:
 * Categories: { _id, masterCategory, subCategory, articleType }
 * Products: { _id, name, brand, categoryId (references Category._id), color, gender, price }
 */

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
    logger.error('Failed to get personalized recommendations', { error: error.message, userId });
    return [];
  }
}

/**
 * Search products by filters
 * Flow: Extract filters → Resolve category from database → Query products by categoryId
 */
async function searchProducts(filters = {}) {
  try {
    const params = new URLSearchParams();

    // Helper: Check if value is MongoDB ObjectId
    const looksLikeObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

    // Step 1: Resolve category to categoryId
    let categoryIdToSend = null;
    if (filters.category || filters.articleType) {
      // If already an ObjectId, use directly
      if (filters.category && looksLikeObjectId(filters.category)) {
        categoryIdToSend = filters.category;
      } else {
        // Normalize input for matching
        const categoryTerm = filters.category ? String(filters.category).trim() : '';
        const articleTerm = filters.articleType ? String(filters.articleType).trim() : '';

        // Step 2: Fetch all categories from database
        try {
          const catRes = await axios.get(`${PRODUCT_SERVICE_URL}/api/categories`, { timeout: 5000 });
          const categories = Array.isArray(catRes.data?.data?.categories) ? catRes.data.data.categories : [];

          logger.info('Fetched categories from database', { count: categories.length });

          let found = null;

          // Normalize function: handle singular/plural and case differences
          const normalize = (str) => {
            if (!str) return '';
            const lower = String(str).toLowerCase().trim();
            // Remove trailing 's' or 'es' to handle plural variations (Shirts → Shirt)
            return lower.replace(/e?s$/, '');
          };

          // Priority 1: Match by articleType (most specific)
          // Example: "Shirt" or "Shirts" → finds articleType: "Shirt"
          if (articleTerm) {
            const normalizedSearch = normalize(articleTerm);
            
            // Try exact match first
            found = categories.find(c => 
              c.articleType && normalize(c.articleType) === normalizedSearch
            );
            
            // Try partial match if exact fails
            if (!found) {
              found = categories.find(c => 
                c.articleType && normalize(c.articleType).includes(normalizedSearch)
              );
            }

            logger.info('Article type search', { 
              input: articleTerm, 
              normalized: normalizedSearch, 
              found: found ? found.articleType : null 
            });
          }

          // Priority 2: Match by masterCategory or subCategory (broader)
          // Example: "Apparel" → finds masterCategory: "Apparel"
          if (!found && categoryTerm) {
            const normalizedSearch = normalize(categoryTerm);
            
            // Try masterCategory exact match
            found = categories.find(c => 
              c.masterCategory && normalize(c.masterCategory) === normalizedSearch
            );
            
            // Try subCategory exact match
            if (!found) {
              found = categories.find(c => 
                c.subCategory && normalize(c.subCategory) === normalizedSearch
              );
            }
            
            // Try partial matches
            if (!found) {
              found = categories.find(c => 
                (c.masterCategory && normalize(c.masterCategory).includes(normalizedSearch)) ||
                (c.subCategory && normalize(c.subCategory).includes(normalizedSearch))
              );
            }

            logger.info('Master/Sub category search', { 
              input: categoryTerm, 
              normalized: normalizedSearch, 
              found: found ? `${found.masterCategory}/${found.subCategory}` : null 
            });
          }

          // Step 3: Save the resolved categoryId
          if (found && found._id) {
            categoryIdToSend = found._id;
            logger.info('✅ Category resolved successfully', {
              input: { category: filters.category, articleType: filters.articleType },
              resolved: { 
                categoryId: found._id, 
                masterCategory: found.masterCategory, 
                subCategory: found.subCategory, 
                articleType: found.articleType 
              }
            });
          } else {
            logger.warn('❌ Category not found in database', {
              input: { category: filters.category, articleType: filters.articleType },
              availableCategories: categories.map(c => ({
                master: c.masterCategory,
                sub: c.subCategory,
                article: c.articleType
              }))
            });
          }
        } catch (err) {
          logger.error('Failed to fetch categories from database', { error: err.message });
        }
      }
    }

    // Step 4: Build query parameters for product search
    if (categoryIdToSend) params.append('categoryId', categoryIdToSend);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.color) params.append('color', filters.color);
    if (filters.limit) params.append('limit', filters.limit);
    
    logger.info('Querying products', { 
      categoryId: categoryIdToSend, 
      brand: filters.brand, 
      gender: filters.gender,
      color: filters.color 
    });

    // Step 5: Query products from product-service
    const response = await axios.get(
      `${PRODUCT_SERVICE_URL}/api/products?${params.toString()}`,
      { timeout: 5000 }
    );

    // Step 6: Return products
    if (response.data?.success && response.data?.data?.products) {
      const products = response.data.data.products;
      logger.info('✅ Products found', { count: products.length });
      return products;
    }
    
    logger.info('No products found matching filters');
    return [];
  } catch (error) {
    logger.error('Product search failed', { 
      error: error.message,
      filters: { category: filters.category, articleType: filters.articleType, brand: filters.brand }
    });
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
    logger.error('Failed to get product by ID', { error: error.message, productId });
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
    logger.error('Failed to get similar products', { error: error.message, productId });
    return [];
  }
}

/**
 * Get general recommendations (diverse product selection)
 */
async function getGeneralRecommendations(limit = 12) {
  try {
    // Get a mix of different categories for diverse recommendations
    const categories = ['Apparel', 'Footwear', 'Accessories'];
    let allProducts = [];
    
    for (const category of categories) {
      const products = await searchProducts({ 
        category, 
        limit: Math.ceil(limit / categories.length) 
      });
      allProducts = allProducts.concat(products);
    }
    
    // If we don't have enough products, get more without category filter
    if (allProducts.length < limit) {
      const additionalProducts = await searchProducts({ limit: limit * 2 });
      allProducts = allProducts.concat(additionalProducts);
    }
    
    // Remove duplicates and limit results
    const uniqueProducts = Array.from(
      new Map(allProducts.map(p => [p._id?.toString() || p.id, p])).values()
    );
    
    // Shuffle and return limited results
    const shuffled = uniqueProducts.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
    
  } catch (error) {
    logger.error('Failed to get general recommendations', { error: error.message });
    return [];
  }
}

module.exports = {
  getPersonalizedRecommendations,
  searchProducts,
  getProductById,
  getSimilarProducts,
  getGeneralRecommendations
};
