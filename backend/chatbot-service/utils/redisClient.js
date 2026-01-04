const { createClient } = require('redis');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
  }

  async connect() {
    try {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || 6379;
      const redisPassword = process.env.REDIS_PASSWORD || undefined;
      const redisEnabled = process.env.REDIS_ENABLED !== 'false';

      if (!redisEnabled) {
        logger.info('Redis is disabled. Using in-memory cache fallback.');
        return false;
      }

      logger.info(`Connecting to Redis at ${redisHost}:${redisPort}...`);

      this.client = createClient({
        socket: {
          host: redisHost,
          port: redisPort,
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              logger.error(`Redis connection failed after ${this.maxRetries} retries. Falling back to in-memory cache.`);
              return false; // Stop retrying
            }
            const delay = Math.min(retries * 100, 3000);
            logger.info(`Redis reconnecting... attempt ${retries}, delay: ${delay}ms`);
            return delay;
          }
        },
        password: redisPassword
      });

      // Event handlers
      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.client.on('ready', () => {
        logger.info('✓ Redis client ready');
        this.isConnected = true;
        this.retryAttempts = 0;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      this.client.on('end', () => {
        logger.warn('Redis connection closed');
        this.isConnected = false;
      });

      await this.client.connect();

      // Test connection
      await this.client.ping();

      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis client disconnected');
      } catch (error) {
        logger.error('Error disconnecting from Redis:', error.message);
      }
    }
  }

  getClient() {
    return this.client;
  }

  isAvailable() {
    return this.isConnected && this.client !== null;
  }
}

// Create singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
