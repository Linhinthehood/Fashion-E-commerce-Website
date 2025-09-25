const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');

// Service configurations
const services = {
  user: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    path: '/api/users',
    healthCheck: '/health'
  },
  auth: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    path: '/api/auth',
    healthCheck: '/health'
  },
  products: {
    target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    path: '/api/products',
    healthCheck: '/health'
  },
  categories: {
    target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    path: '/api/categories',
    healthCheck: '/health'
  },
  orders: {
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    path: '/api/orders',
    healthCheck: '/health'
  },
  cart: {
    target: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    path: '/api/cart',
    healthCheck: '/health'
  }
};

// Health check function
const checkServiceHealth = async (serviceName) => {
  try {
    const service = services[serviceName];
    if (!service) return false;

    const response = await axios.get(`${service.target}${service.healthCheck}`, {
      timeout: 5000
    });
    
    return response.status === 200;
  } catch (error) {
    console.error(`Health check failed for ${serviceName}:`, error.message);
    return false;
  }
};

// Create proxy middleware for each service
const createServiceProxy = (serviceName) => {
  const service = services[serviceName];
  
  if (!service) {
    throw new Error(`Service ${serviceName} not found`);
  }

  return createProxyMiddleware({
    target: service.target,
    changeOrigin: true,
    pathRewrite: {
      [`^${service.path}`]: service.path
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${serviceName}:`, err.message);
      res.status(503).json({
        success: false,
        message: `${serviceName} service is temporarily unavailable`,
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add request ID for tracing
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('x-request-id', requestId);
      
      // Log request
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${serviceName} service`);
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add CORS headers
      proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
      proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
      
      // Log response
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} <- ${serviceName} service (${proxyRes.statusCode})`);
    }
  });
};

// Service health status
let serviceHealthStatus = {};

// Update service health status
const updateServiceHealth = async () => {
  for (const serviceName of Object.keys(services)) {
    serviceHealthStatus[serviceName] = await checkServiceHealth(serviceName);
  }
};

// Get service health status
const getServiceHealth = () => {
  return serviceHealthStatus;
};

// Check if service is healthy
const isServiceHealthy = (serviceName) => {
  return serviceHealthStatus[serviceName] === true;
};

// Middleware to check service health before proxying
const healthCheckMiddleware = (serviceName) => {
  return (req, res, next) => {
    if (!isServiceHealthy(serviceName)) {
      return res.status(503).json({
        success: false,
        message: `${serviceName} service is currently unavailable`,
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
};

// Initialize health checks
const initializeHealthChecks = () => {
  // Initial health check
  updateServiceHealth();
  
  // Periodic health checks every 30 seconds
  setInterval(updateServiceHealth, 30000);
};

module.exports = {
  createServiceProxy,
  checkServiceHealth,
  updateServiceHealth,
  getServiceHealth,
  isServiceHealthy,
  healthCheckMiddleware,
  initializeHealthChecks,
  services
};
