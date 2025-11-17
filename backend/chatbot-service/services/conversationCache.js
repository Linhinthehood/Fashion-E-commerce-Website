/**
 * Conversation Cache Service
 * Stores conversation history per user so chatbot remembers context
 */

class ConversationCache {
  constructor() {
    // Map: userId -> conversationHistory array
    this.cache = new Map();
    
    // Configuration
    this.maxHistoryPerUser = 10; // Keep last 10 messages per user
    this.cacheExpiryMs = 30 * 60 * 1000; // 30 minutes
    
    // Map: userId -> timestamp of last activity
    this.lastActivity = new Map();
    
    // Start cleanup interval (every 5 minutes)
    this.startCleanup();
  }

  /**
   * Get conversation history for a user
   * @param {string} userId - User ID
   * @returns {Array} - Conversation history [{role: 'user'|'model', content: string}]
   */
  getHistory(userId) {
    if (!userId) return [];
    
    // Check if expired
    const lastTime = this.lastActivity.get(userId);
    if (lastTime && Date.now() - lastTime > this.cacheExpiryMs) {
      // Expired - clear and return empty
      this.cache.delete(userId);
      this.lastActivity.delete(userId);
      return [];
    }
    
    return this.cache.get(userId) || [];
  }

  /**
   * Add a message to user's conversation history
   * @param {string} userId - User ID
   * @param {string} role - 'user' or 'model'
   * @param {string} content - Message content
   */
  addMessage(userId, role, content) {
    if (!userId) return;
    
    let history = this.cache.get(userId) || [];
    
    // Add new message
    history.push({ role, content });
    
    // Keep only last N messages (prevent memory bloat)
    if (history.length > this.maxHistoryPerUser) {
      history = history.slice(-this.maxHistoryPerUser);
    }
    
    this.cache.set(userId, history);
    this.lastActivity.set(userId, Date.now());
  }

  /**
   * Clear conversation history for a user
   * @param {string} userId - User ID
   */
  clearHistory(userId) {
    if (!userId) return;
    this.cache.delete(userId);
    this.lastActivity.delete(userId);
  }

  /**
   * Clear all conversations
   */
  clearAll() {
    this.cache.clear();
    this.lastActivity.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Stats
   */
  getStats() {
    return {
      totalUsers: this.cache.size,
      totalMessages: Array.from(this.cache.values()).reduce((sum, history) => sum + history.length, 0),
      oldestActivity: this.lastActivity.size > 0 ? Math.min(...Array.from(this.lastActivity.values())) : null,
      newestActivity: this.lastActivity.size > 0 ? Math.max(...Array.from(this.lastActivity.values())) : null
    };
  }

  /**
   * Periodic cleanup of expired conversations
   */
  startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiredUsers = [];
      
      for (const [userId, lastTime] of this.lastActivity.entries()) {
        if (now - lastTime > this.cacheExpiryMs) {
          expiredUsers.push(userId);
        }
      }
      
      expiredUsers.forEach(userId => {
        this.cache.delete(userId);
        this.lastActivity.delete(userId);
      });
      
      if (expiredUsers.length > 0) {
        console.log(`🧹 Cleaned up ${expiredUsers.length} expired conversations`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Export singleton instance
module.exports = new ConversationCache();
