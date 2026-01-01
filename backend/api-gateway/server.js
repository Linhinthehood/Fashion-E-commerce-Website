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

// Lấy cấu hình URL từ biến môi trường
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://order-service:3003';
const FASHION_SERVICE_URL = process.env.FASHION_SERVICE_URL || 'http://fashion-service:3008';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://34.158.61.208:5173';

// --- SỬA ĐỔI QUAN TRỌNG 1: HELMET ---
// Tắt CSP và cho phép Cross-Origin Resource để tránh lỗi "Refused to connect"
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
}));

app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

// --- SỬA ĐỔI QUAN TRỌNG 2: CORS ---
app.use(cors({
  origin: function (origin, callback) {
    // Cho phép request không có origin (như curl, postman, mobile app)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      FRONTEND_URL,              // URL lấy từ .env
      'http://34.158.61.208:5173', // IP Public Frontend
      'http://34.158.61.208:3000'  // IP Public Backend
    ];

    // Kiểm tra xem origin có nằm trong danh sách cho phép không
    // (Dùng includes để so sánh chính xác hoặc logic regex nếu cần)
    const isAllowed = allowedOrigins.some(allowed => 
      origin === allowed || origin === allowed.replace(/\/$/, "")
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`⚠️ Blocked by CORS: ${origin}`);
      // MẸO: Trong lúc sửa lỗi, tạm thời cho qua hết để test (bỏ comment dòng dưới nếu vẫn lỗi)
      callback(null, true); 
      // callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
      order: ORDER_SERVICE_URL,
      fashion: FASHION_SERVICE_URL
    }
  });
});

// Hàm tạo Proxy thông minh
const buildServiceProxy = (targetUrl, serviceName) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    xfwd: true,     // Thêm x-forwarded headers
    ws: true,       // Hỗ trợ WebSocket
    proxyTimeout: 30000,
    timeout: 30000,
    secure: false,  // Bỏ qua SSL nếu chạy nội bộ
    logLevel: 'debug', // Bật log chi tiết để dễ debug lỗi
    pathRewrite: (path, req) => {
      return req.originalUrl || path;
    },
    onProxyReq: (proxyReq, req, res) => {
      // Đảm bảo Headers CORS được giữ nguyên khi đi qua Proxy
      const origin = req.headers.origin;
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('X-Served-By', serviceName);
    },
    onError: (err, req, res) => {
      console.error(`❌ Proxy error for ${serviceName}:`, err.message);
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

// Middleware log request để debug
app.use('/api/*', (req, res, next) => {
  console.log(`🔍 Gateway: ${req.method} ${req.originalUrl}`);
  next();
});

// --- ĐỊNH TUYẾN (ROUTING) ---

// User Service routes
app.use('/api/auth', buildServiceProxy(USER_SERVICE_URL, 'user-service'));
app.use('/api/customers', buildServiceProxy(USER_SERVICE_URL, 'user-service'));

// Order Service routes
app.use('/api/orders', buildServiceProxy(ORDER_SERVICE_URL, 'order-service'));
app.use('/api/events', buildServiceProxy(ORDER_SERVICE_URL, 'order-service'));

// Product Service routes
app.use('/api/products', buildServiceProxy(PRODUCT_SERVICE_URL, 'product-service'));
app.use('/api/categories', buildServiceProxy(PRODUCT_SERVICE_URL, 'product-service'));
app.use('/api/variants', buildServiceProxy(PRODUCT_SERVICE_URL, 'product-service'));

// Fashion Service routes
app.use('/api/recommendations', buildServiceProxy(FASHION_SERVICE_URL, 'fashion-service'));

// Chatbot Service routes (Proxy thẳng sang port 3009 nếu cần, hoặc để Frontend gọi trực tiếp)
// Nếu Frontend gọi thẳng port 3009 thì không cần dòng này.

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found in API Gateway' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`🌍 Frontend URL allowed: ${FRONTEND_URL}`);
  console.log(`📡 Services configured:`);
  console.log(`   - User: ${USER_SERVICE_URL}`);
  console.log(`   - Product: ${PRODUCT_SERVICE_URL}`);
  console.log(`   - Order: ${ORDER_SERVICE_URL}`);
  console.log(`   - Fashion: ${FASHION_SERVICE_URL}`);
});