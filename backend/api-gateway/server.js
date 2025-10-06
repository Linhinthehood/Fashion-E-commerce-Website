const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(morgan('dev'));

// NOTE: Do not use body parsers here; we want to stream bodies to services

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    FRONTEND_URL
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    gateway: 'api-gateway', 
    timestamp: new Date().toISOString(),
    services: {
      user: USER_SERVICE_URL,
      product: PRODUCT_SERVICE_URL,
      order: ORDER_SERVICE_URL
    }
  });
});

// Build a robust streaming proxy
const buildServiceProxy = (targetUrl, serviceName) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    xfwd: true,
    ws: true,
    proxyTimeout: 30_000,
    timeout: 30_000,
    secure: false,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    pathRewrite: (path, req) => {
      // Preserve full original URL so mounted path isn't stripped by Express
      return req.originalUrl || path;
    },
    onProxyReq: (proxyReq, req, res) => {
      // Ensure CORS passthrough headers
      const origin = req.headers.origin;
      if (origin && [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        FRONTEND_URL
      ].includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('X-Served-By', serviceName);

      // Do not write body manually; let http-proxy-middleware stream the original request body
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${serviceName}:`, err.message);
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: `${serviceName} service is currently unavailable`,
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }
  });
};

// Debug middleware
app.use('/api/*', (req, res, next) => {
  console.log(`🔍 API Gateway received: ${req.method} ${req.originalUrl}`);
  next();
});

// Handle preflight quickly
app.options('*', (req, res) => {
  res.sendStatus(204);
});

// User Service routes
app.use('/api/auth', buildServiceProxy(USER_SERVICE_URL, 'user-service'));
app.use('/api/customers', buildServiceProxy(USER_SERVICE_URL, 'user-service'));

// Order Service routes
app.use('/api/orders', buildServiceProxy(ORDER_SERVICE_URL, 'order-service'));

// Product Service routes
app.use('/api/products', buildServiceProxy(PRODUCT_SERVICE_URL, 'product-service'));
app.use('/api/categories', buildServiceProxy(PRODUCT_SERVICE_URL, 'product-service'));
app.use('/api/variants', buildServiceProxy(PRODUCT_SERVICE_URL, 'product-service'));

// 404 for non-API routes
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found in gateway' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Services configured:`);
  console.log(`   🔐 User Service: ${USER_SERVICE_URL}`);
  console.log(`   📦 Product Service: ${PRODUCT_SERVICE_URL}`);
  console.log(`   🛒 Order Service: ${ORDER_SERVICE_URL}`);
});