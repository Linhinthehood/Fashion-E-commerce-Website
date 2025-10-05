const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(helmet());
app.use(morgan('dev'));

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

// Manual proxy function
const createServiceProxy = (targetUrl, serviceName) => {
  return async (req, res) => {
    try {
      console.log(`🔄 Proxying ${req.method} ${req.originalUrl} to ${serviceName} (${targetUrl})`);
      
      const url = new URL(targetUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: req.originalUrl,
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-service': 'api-gateway',
          'x-forwarded-to': serviceName,
          ...req.headers
        }
      };

      const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        
        proxyRes.on('data', (chunk) => {
          data += chunk;
        });
        
        proxyRes.on('end', () => {
          res.status(proxyRes.statusCode);
          
          // Set CORS headers
          const origin = req.headers.origin;
          if (origin && [
            'http://localhost:3000',
            'http://localhost:5173', 
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3003'
          ].includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
          }
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.setHeader('X-Served-By', serviceName);
          
          // Copy other headers
          Object.keys(proxyRes.headers).forEach(key => {
            if (!['access-control-allow-origin', 'access-control-allow-credentials'].includes(key.toLowerCase())) {
              res.setHeader(key, proxyRes.headers[key]);
            }
          });
          
          res.send(data);
        });
      });

      proxyReq.on('error', (err) => {
        console.error(`Proxy error for ${serviceName}:`, err.message);
        res.status(503).json({
          success: false,
          message: `${serviceName} service is currently unavailable`,
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      });

      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        proxyReq.write(JSON.stringify(req.body));
      }
      
      proxyReq.end();
      
    } catch (error) {
      console.error(`Proxy error for ${serviceName}:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
};

// Debug middleware
app.use('/api/*', (req, res, next) => {
  console.log(`🔍 API Gateway received: ${req.method} ${req.originalUrl}`);
  next();
});

// User Service routes
app.use('/api/auth', createServiceProxy(USER_SERVICE_URL, 'user-service'));
app.use('/api/customers', createServiceProxy(USER_SERVICE_URL, 'user-service'));

// Order Service routes
app.use('/api/orders', createServiceProxy(ORDER_SERVICE_URL, 'order-service'));
app.use('/api/cart', createServiceProxy(ORDER_SERVICE_URL, 'order-service'));

// Product Service routes
app.use('/api/products', createServiceProxy(PRODUCT_SERVICE_URL, 'product-service'));
app.use('/api/categories', createServiceProxy(PRODUCT_SERVICE_URL, 'product-service'));
app.use('/api/variants', createServiceProxy(PRODUCT_SERVICE_URL, 'product-service'));

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


