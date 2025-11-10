const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3004;

// Trust proxy - Required when behind a proxy (ngrok, API Gateway, load balancer)
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// Rate limiting
// Skip rate limiting for webhook endpoints (VNPay needs to send webhooks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  skip: (req) => {
    // Skip rate limiting for webhook endpoints
    return req.path.startsWith('/api/payments/webhooks') || req.path.startsWith('/api/payments/return');
  }
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
// Important: For webhooks, we need to handle both JSON and URL-encoded data
// VNPay sends webhooks as URL-encoded form data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb', parameterLimit: 10000 }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Payment service is running',
    timestamp: new Date().toISOString(),
    service: 'payment-service',
    version: '1.0.0'
  });
});

// API routes
app.use('/api/payments', paymentRoutes);

// Webhook routes - VNPay sends POST requests to this endpoint
app.use('/api/payments/webhooks', webhookRoutes);

// Return URL route (for VNPay redirect after payment)
const { handleVNPayReturn } = require('./controllers/webhookController');
app.get('/api/payments/return/vnpay', handleVNPayReturn);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Payment service running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`VNPay TMN Code: ${process.env.VNPAY_TMN_CODE || 'Not configured'}`);
      console.log(`Order Service URL: ${process.env.ORDER_SERVICE_URL || 'Not configured'}`);
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
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

startServer();

module.exports = app;

