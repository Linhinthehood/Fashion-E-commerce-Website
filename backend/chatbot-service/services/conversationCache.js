/**
 * Conversation Cache Service with Redis Support
 *
 * Features:
 * - Redis-first caching with in-memory fallback
 * - Automatic TTL (Time To Live) expiration
 * - Survives server restarts when using Redis
 * - Scalable across multiple server instances
 */

const redisClient = require('../utils/redisClient');

class ConversationCache {
  constructor() {
    // In-memory fallback (used if Redis unavailable)
    this.memoryCache = new Map();
    this.lastActivity = new Map();

    // Configuration
    this.maxHistoryPerUser = 10; // Keep last 10 messages per user
    this.cacheExpiryMs = 30 * 60 * 1000; // 30 minutes
    this.cacheExpirySec = 30 * 60; // 30 minutes in seconds for Redis TTL

    // Track mode
    this.useRedis = false;

    // Start cleanup for in-memory cache (only runs if Redis fails)
    this.cleanupInterval = null;
  }

  /**
   * Initialize Redis connection
   * Call this on server startup
   */
  async initialize() {
    try {
      this.useRedis = await redisClient.connect();

      if (this.useRedis) {
        console.log('✓ Conversation cache using Redis (persistent, scalable)');
      } else {
        console.log('⚠ Conversation cache using in-memory fallback (will be lost on restart)');
        this.startMemoryCleanup();
      }
    } catch (error) {
      console.error('Redis initialization failed, using in-memory cache:', error.message);
      this.useRedis = false;
      this.startMemoryCleanup();
    }
  }

  /**
   * Get conversation history for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Conversation history [{role: 'user'|'model', content: string}]
   */
  async getHistory(userId) {
    if (!userId) return [];

    if (this.useRedis && redisClient.isAvailable()) {
      return await this._getHistoryFromRedis(userId);
    } else {
      return this._getHistoryFromMemory(userId);
    }
  }

  /**
   * Add a message to user's conversation history
   * @param {string} userId - User ID
   * @param {string} role - 'user' or 'model'
   * @param {string} content - Message content
   */
  async addMessage(userId, role, content) {
    if (!userId) return;

    if (this.useRedis && redisClient.isAvailable()) {
      await this._addMessageToRedis(userId, role, content);
    } else {
      this._addMessageToMemory(userId, role, content);
    }
  }

  /**
   * Clear conversation history for a user
   * @param {string} userId - User ID
   */
  async clearHistory(userId) {
    if (!userId) return;

    if (this.useRedis && redisClient.isAvailable()) {
      await this._clearHistoryFromRedis(userId);
    } else {
      this._clearHistoryFromMemory(userId);
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} - Stats
   */
  async getStats() {
    if (this.useRedis && redisClient.isAvailable()) {
      return await this._getRedisStats();
    } else {
      return this._getMemoryStats();
    }
  }

  // ==================== REDIS METHODS ====================

  async _getHistoryFromRedis(userId) {
    try {
      const client = redisClient.getClient();
      const key = `conversation:${userId}`;
      const data = await client.get(key);

      if (!data) return [];

      return JSON.parse(data);
    } catch (error) {
      console.error('Redis getHistory error:', error.message);
      // Fallback to memory
      return this._getHistoryFromMemory(userId);
    }
  }

  async _addMessageToRedis(userId, role, content) {
    try {
      const client = redisClient.getClient();
      const key = `conversation:${userId}`;

      // Get existing history
      let history = await this._getHistoryFromRedis(userId);

      // Add new message
      history.push({ role, content });

      // Keep only last N messages
      if (history.length > this.maxHistoryPerUser) {
        history = history.slice(-this.maxHistoryPerUser);
      }

      // Store with TTL (auto-expiration)
      await client.setEx(key, this.cacheExpirySec, JSON.stringify(history));
    } catch (error) {
      console.error('Redis addMessage error:', error.message);
      // Fallback to memory
      this._addMessageToMemory(userId, role, content);
    }
  }

  async _clearHistoryFromRedis(userId) {
    try {
      const client = redisClient.getClient();
      const key = `conversation:${userId}`;
      await client.del(key);
    } catch (error) {
      console.error('Redis clearHistory error:', error.message);
      this._clearHistoryFromMemory(userId);
    }
  }

  async _getRedisStats() {
    try {
      const client = redisClient.getClient();

      // Get all conversation keys
      const keys = await client.keys('conversation:*');

      let totalMessages = 0;
      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const history = JSON.parse(data);
          totalMessages += history.length;
        }
      }

      return {
        mode: 'redis',
        totalUsers: keys.length,
        totalMessages,
        redisConnected: redisClient.isAvailable()
      };
    } catch (error) {
      console.error('Redis stats error:', error.message);
      return {
        mode: 'redis (error)',
        error: error.message,
        redisConnected: false
      };
    }
  }

  // ==================== IN-MEMORY FALLBACK METHODS ====================

  _getHistoryFromMemory(userId) {
    // Check if expired
    const lastTime = this.lastActivity.get(userId);
    if (lastTime && Date.now() - lastTime > this.cacheExpiryMs) {
      // Expired - clear and return empty
      this.memoryCache.delete(userId);
      this.lastActivity.delete(userId);
      return [];
    }

    return this.memoryCache.get(userId) || [];
  }

  _addMessageToMemory(userId, role, content) {
    let history = this.memoryCache.get(userId) || [];

    // Add new message
    history.push({ role, content });

    // Keep only last N messages
    if (history.length > this.maxHistoryPerUser) {
      history = history.slice(-this.maxHistoryPerUser);
    }

    this.memoryCache.set(userId, history);
    this.lastActivity.set(userId, Date.now());
  }

  _clearHistoryFromMemory(userId) {
    this.memoryCache.delete(userId);
    this.lastActivity.delete(userId);
  }

  _getMemoryStats() {
    return {
      mode: 'in-memory',
      totalUsers: this.memoryCache.size,
      totalMessages: Array.from(this.memoryCache.values()).reduce((sum, history) => sum + history.length, 0),
      oldestActivity: this.lastActivity.size > 0 ? Math.min(...Array.from(this.lastActivity.values())) : null,
      newestActivity: this.lastActivity.size > 0 ? Math.max(...Array.from(this.lastActivity.values())) : null,
      redisConnected: false
    };
  }

  // ==================== CLEANUP ====================

  /**
   * Periodic cleanup of expired conversations (only for in-memory mode)
   */
  startMemoryCleanup() {
    if (this.cleanupInterval) return; // Already running

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiredUsers = [];

      for (const [userId, lastTime] of this.lastActivity.entries()) {
        if (now - lastTime > this.cacheExpiryMs) {
          expiredUsers.push(userId);
        }
      }

      expiredUsers.forEach(userId => {
        this.memoryCache.delete(userId);
        this.lastActivity.delete(userId);
      });

      if (expiredUsers.length > 0) {
        console.log(`🧹 Cleaned up ${expiredUsers.length} expired conversations (in-memory mode)`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  async stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Disconnect Redis
    if (this.useRedis) {
      await redisClient.disconnect();
    }
  }

  /**
   * Clear all conversations (use with caution!)
   */
  async clearAll() {
    if (this.useRedis && redisClient.isAvailable()) {
      try {
        const client = redisClient.getClient();
        const keys = await client.keys('conversation:*');
        if (keys.length > 0) {
          await client.del(keys);
        }
      } catch (error) {
        console.error('Redis clearAll error:', error.message);
      }
    }

    // Also clear memory cache
    this.memoryCache.clear();
    this.lastActivity.clear();
  }
}

// Export singleton instance
const conversationCache = new ConversationCache();

module.exports = conversationCache;
