const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { 
  createServiceProxy, 
  healthCheckMiddleware, 
  initializeHealthChecks 
} = require('./middleware/proxy');
const { authenticate, optionalAuth } = require('./middleware/auth');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// Health check routes
app.use('/health', healthRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Fashion E-commerce API Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        base: '/api/auth',
        description: 'User authentication and profile management',
        methods: ['GET', 'POST', 'PUT']
      },
      products: {
        base: '/api/products',
        description: 'Product catalog and search',
        methods: ['GET']
      },
      categories: {
        base: '/api/categories',
        description: 'Product categories',
        methods: ['GET']
      },
      orders: {
        base: '/api/orders',
        description: 'Order management',
        methods: ['GET', 'POST', 'PUT'],
        auth: 'required'
      },
      cart: {
        base: '/api/cart',
        description: 'Shopping cart management',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        auth: 'required'
      }
    }
  });
});

// Service routing with health checks and authentication

// User Service Routes
app.use('/api/auth', 
  healthCheckMiddleware('auth'),
  createServiceProxy('auth')
);

// Product Service Routes
app.use('/api/products', 
  healthCheckMiddleware('products'),
  createServiceProxy('products')
);

app.use('/api/categories', 
  healthCheckMiddleware('categories'),
  createServiceProxy('categories')
);

// Order Service Routes (require authentication)
app.use('/api/orders', 
  authenticate,
  healthCheckMiddleware('orders'),
  createServiceProxy('orders')
);

app.use('/api/cart', 
  authenticate,
  healthCheckMiddleware('cart'),
  createServiceProxy('cart')
);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const startServer = () => {
  try {
    // Initialize health checks
    initializeHealthChecks();
    
    app.listen(PORT, () => {
      console.log(`API Gateway running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log('Available services:');
      console.log('  - User Service:', process.env.USER_SERVICE_URL || 'http://localhost:3001');
      console.log('  - Product Service:', process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002');
      console.log('  - Order Service:', process.env.ORDER_SERVICE_URL || 'http://localhost:3003');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

startServer();

module.exports = app;
