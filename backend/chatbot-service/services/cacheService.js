/**
 * Cache Service for Products, Categories, and AI Responses
 * Uses Redis for distributed caching with in-memory fallback
 */

const redisClient = require('../utils/redisClient');
const crypto = require('crypto');

class CacheService {
  constructor() {
    // In-memory fallback
    this.memoryCache = new Map();

    // TTL configuration (in seconds)
    this.ttl = {
      categories: 3600,      // 1 hour (categories change rarely)
      productSearch: 300,    // 5 minutes (products change occasionally)
      geminiResponse: 1800,  // 30 minutes (AI responses)
      userPreferences: 7200  // 2 hours (user preferences)
    };

    // Memory cache size limit (prevent memory leaks)
    this.maxMemoryCacheSize = 1000;
  }

  /**
   * Generate cache key from object
   */
  _generateKey(prefix, data) {
    if (typeof data === 'string') {
      return `${prefix}:${data}`;
    }

    // Create deterministic hash from object
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);

    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    // Try Redis first
    if (redisClient.isAvailable()) {
      try {
        const data = await redisClient.getClient().get(key);
        if (data) {
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('Redis get error:', error.message);
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // Expired or not found
    if (cached) {
      this.memoryCache.delete(key);
    }
    return null;
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttlSeconds) {
    const data = JSON.stringify(value);

    // Try Redis first
    if (redisClient.isAvailable()) {
      try {
        await redisClient.getClient().setEx(key, ttlSeconds, data);
        return true;
      } catch (error) {
        console.error('Redis set error:', error.message);
      }
    }

    // Fallback to memory cache
    // Limit memory cache size
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      // Remove oldest entry
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      data: value,
      expires: Date.now() + (ttlSeconds * 1000)
    });

    return true;
  }

  /**
   * Delete from cache
   */
  async delete(key) {
    if (redisClient.isAvailable()) {
      try {
        await redisClient.getClient().del(key);
      } catch (error) {
        console.error('Redis delete error:', error.message);
      }
    }

    this.memoryCache.delete(key);
  }

  /**
   * Clear all cache with specific prefix
   */
  async clearPrefix(prefix) {
    if (redisClient.isAvailable()) {
      try {
        const client = redisClient.getClient();
        const keys = await client.keys(`${prefix}:*`);
        if (keys.length > 0) {
          await client.del(keys);
        }
      } catch (error) {
        console.error('Redis clearPrefix error:', error.message);
      }
    }

    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${prefix}:`)) {
        this.memoryCache.delete(key);
      }
    }
  }

  // ==================== SPECIALIZED CACHE METHODS ====================

  /**
   * Cache categories list
   */
  async getCachedCategories() {
    return await this.get('categories:all');
  }

  async setCachedCategories(categories) {
    return await this.set('categories:all', categories, this.ttl.categories);
  }

  /**
   * Cache product search results
   */
  async getCachedProductSearch(filters) {
    const key = this._generateKey('product-search', filters);
    return await this.get(key);
  }

  async setCachedProductSearch(filters, products) {
    const key = this._generateKey('product-search', filters);
    return await this.set(key, products, this.ttl.productSearch);
  }

  /**
   * Cache Gemini AI responses (reduce API calls)
   */
  async getCachedGeminiResponse(message, intent) {
    const key = this._generateKey('gemini', { message, intent: intent?.intent });
    return await this.get(key);
  }

  async setCachedGeminiResponse(message, intent, response) {
    const key = this._generateKey('gemini', { message, intent: intent?.intent });
    return await this.set(key, response, this.ttl.geminiResponse);
  }

  /**
   * Cache user preferences
   */
  async getCachedUserPreferences(userId) {
    return await this.get(`user-prefs:${userId}`);
  }

  async setCachedUserPreferences(userId, preferences) {
    return await this.set(`user-prefs:${userId}`, preferences, this.ttl.userPreferences);
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    let redisStats = null;

    if (redisClient.isAvailable()) {
      try {
        const client = redisClient.getClient();
        const keys = await client.keys('*');

        const stats = {
          categories: 0,
          productSearch: 0,
          gemini: 0,
          userPrefs: 0,
          other: 0
        };

        for (const key of keys) {
          if (key.startsWith('categories:')) stats.categories++;
          else if (key.startsWith('product-search:')) stats.productSearch++;
          else if (key.startsWith('gemini:')) stats.gemini++;
          else if (key.startsWith('user-prefs:')) stats.userPrefs++;
          else stats.other++;
        }

        redisStats = {
          total: keys.length,
          breakdown: stats
        };
      } catch (error) {
        console.error('Redis stats error:', error.message);
      }
    }

    return {
      mode: redisClient.isAvailable() ? 'redis' : 'in-memory',
      redis: redisStats,
      memory: {
        size: this.memoryCache.size,
        maxSize: this.maxMemoryCacheSize
      }
    };
  }
}

// Export singleton
module.exports = new CacheService();
