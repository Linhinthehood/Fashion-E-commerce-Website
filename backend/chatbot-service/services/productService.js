const axios = require('axios');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

const FASHION_SERVICE_URL = process.env.FASHION_SERVICE_URL || 'http://localhost:3008';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

/**
 * SMART PRODUCT FILTERING SYSTEM
 * 
 * This enhanced service analyzes product attributes to determine suitability:
 * - usage: Casual, Formal, Sports, Daily
 * - gender: Male, Female, Unisex
 * - color: For occasion matching
 * - description: For additional context
 * 
 * Occasion Mapping:
 * - party → Casual/Formal (depending on formality)
 * - wedding → Formal only
 * - interview → Formal only
 * - casual → Casual/Daily
 * - gym/sport → Sports
 * - work → Formal/Daily
 */

/**
 * Map user occasion to appropriate usage types
 */
const getUsageForOccasion = (occasion) => {
  const occasionMap = {
    'wedding': ['Formal'],
    'interview': ['Formal'],
    'formal': ['Formal'],
    'work': ['Formal', 'Daily'],
    'office': ['Formal', 'Daily'],
    'party': ['Formal', 'Casual'],
    'celebration': ['Formal', 'Casual'],
    'casual': ['Casual', 'Daily'],
    'daily': ['Daily', 'Casual'],
    'gym': ['Sports'],
    'sport': ['Sports'],
    'workout': ['Sports'],
    'exercise': ['Sports']
  };

  return occasionMap[occasion?.toLowerCase()] || ['Casual', 'Daily', 'Formal'];
};

/**
 * Smart product filtering based on occasion and usage
 */
const filterProductsByOccasion = (products, occasion) => {
  if (!occasion || !products || products.length === 0) {
    return products;
  }

  const allowedUsages = getUsageForOccasion(occasion);
  
  logger.info('🎯 Smart filtering by occasion', {
    occasion,
    allowedUsages,
    totalProducts: products.length
  });

  const filtered = products.filter(product => {
    // If product has usage field, check if it matches occasion
    if (product.usage) {
      const matches = allowedUsages.includes(product.usage);
      if (!matches) {
        logger.debug(`  ❌ Filtered out: ${product.name} (usage: ${product.usage})`);
      }
      return matches;
    }
    // If no usage field, include it (backward compatibility)
    return true;
  });

  logger.info('✅ Filtering complete', {
    before: products.length,
    after: filtered.length,
    removed: products.length - filtered.length
  });

  return filtered;
};

/**
 * Get personalized recommendations for a user
 */
async function getPersonalizedRecommendations(userId, limit = 8) {
  try {
    const response = await axios.post(
      `${FASHION_SERVICE_URL}/api/recommendations/retrieve/personalized`,
      {
        recentItemIds: [],
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
 * Search products by filters WITH SMART OCCASION MATCHING
 */
async function searchProducts(filters = {}) {
  try {
    // Check cache first
    const cached = await cacheService.getCachedProductSearch(filters);
    if (cached) {
      logger.info('Product search cache HIT', { filters });
      return cached;
    }

    logger.info('Product search cache MISS', { filters });

    const params = new URLSearchParams();

    // Helper: Check if value is MongoDB ObjectId
    const looksLikeObjectId = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

    // Step 1: Resolve category to categoryId
    let categoryIdToSend = null;
    if (filters.category || filters.articleType) {
      if (filters.category && looksLikeObjectId(filters.category)) {
        categoryIdToSend = filters.category;
      } else {
        const categoryTerm = filters.category ? String(filters.category).trim() : '';
        const articleTerm = filters.articleType ? String(filters.articleType).trim() : '';

        try {
          // Check cache first
          let categories = await cacheService.getCachedCategories();

          if (!categories) {
            logger.info('Categories cache MISS - fetching from database');
            const catRes = await axios.get(`${PRODUCT_SERVICE_URL}/api/categories`, { timeout: 5000 });
            categories = Array.isArray(catRes.data?.data?.categories) ? catRes.data.data.categories : [];

            // Cache categories
            await cacheService.setCachedCategories(categories);
          } else {
            logger.info('Categories cache HIT', { count: categories.length });
          }

          logger.info('Using categories list', { count: categories.length });

          let found = null;

          const normalize = (str) => {
            if (!str) return '';
            let lower = String(str).toLowerCase().trim();
            const exactTerms = ['shirt', 'pants', 'watch', 'wallet', 'sandals', 'baseball cap', 'casual shoes'];
            if (exactTerms.includes(lower)) return lower;
            return lower.replace(/s$/, '');
          };

          // Priority 1: Match by articleType
          if (articleTerm) {
            const normalizedSearch = normalize(articleTerm);
            
            found = categories.find(c => 
              c.articleType && normalize(c.articleType) === normalizedSearch
            );
            
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

          // Priority 2: Match by masterCategory or subCategory
          if (!found && categoryTerm) {
            const normalizedSearch = normalize(categoryTerm);
            
            found = categories.find(c => 
              c.masterCategory && normalize(c.masterCategory) === normalizedSearch
            );
            
            if (!found) {
              found = categories.find(c => 
                c.subCategory && normalize(c.subCategory) === normalizedSearch
              );
            }
            
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
            logger.warn('⚠️ Category not found in database', {
              input: { category: filters.category, articleType: filters.articleType }
            });
          }
        } catch (err) {
          logger.error('Failed to fetch categories from database', { error: err.message });
        }
      }
    }

    // Step 2: Build query parameters for product search
    if (categoryIdToSend) params.append('categoryId', categoryIdToSend);
    if (filters.brand) params.append('brand', filters.brand);
    if (filters.gender) params.append('gender', filters.gender);
    if (filters.color) params.append('color', filters.color);
    
    // IMPORTANT: Request MORE products than needed for smart filtering
    const requestLimit = filters.limit ? filters.limit * 3 : 50;
    params.append('limit', requestLimit);
    
    logger.info('Querying products with smart filtering', { 
      categoryId: categoryIdToSend, 
      brand: filters.brand, 
      gender: filters.gender,
      color: filters.color,
      occasion: filters.occasion,
      requestLimit
    });

    // Step 3: Query products from product-service
    const response = await axios.get(
      `${PRODUCT_SERVICE_URL}/api/products?${params.toString()}`,
      { timeout: 5000 }
    );

    if (response.data?.success && response.data?.data?.products) {
      let products = response.data.data.products;
      
      logger.info('📦 Products received from database', { 
        count: products.length,
        occasion: filters.occasion 
      });

      // Step 4: SMART FILTERING by occasion and usage
      if (filters.occasion) {
        products = filterProductsByOccasion(products, filters.occasion);
      }

      // Step 5: Limit to requested amount
      if (filters.limit && products.length > filters.limit) {
        products = products.slice(0, filters.limit);
      }

      logger.info('✅ Final products after smart filtering', { count: products.length });

      // Cache the results
      await cacheService.setCachedProductSearch(filters, products);

      return products;
    }
    
    logger.info('No products found matching filters');
    return [];
  } catch (error) {
    logger.error('Product search failed', { 
      error: error.message,
      filters: { 
        category: filters.category, 
        articleType: filters.articleType, 
        brand: filters.brand,
        occasion: filters.occasion 
      }
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
    const categories = ['Apparel', 'Footwear', 'Accessories'];
    let allProducts = [];
    
    for (const category of categories) {
      const products = await searchProducts({ 
        category, 
        limit: Math.ceil(limit / categories.length) 
      });
      allProducts = allProducts.concat(products);
    }
    
    if (allProducts.length < limit) {
      const additionalProducts = await searchProducts({ limit: limit * 2 });
      allProducts = allProducts.concat(additionalProducts);
    }
    
    const uniqueProducts = Array.from(
      new Map(allProducts.map(p => [p._id?.toString() || p.id, p])).values()
    );
    
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
  getGeneralRecommendations,
  filterProductsByOccasion, // Export for testing
  getUsageForOccasion // Export for testing
};