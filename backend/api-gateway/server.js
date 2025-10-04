const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
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
    FRONTEND_URL
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.get('/health', (req, res) => {
  res.json({ success: true, gateway: 'api-gateway', timestamp: new Date().toISOString() });
});

// Normalize /api prefix and proxy to product service
app.use('/api', createProxyMiddleware({
  target: PRODUCT_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  // Express strips the mount path (/api), so req.url here is e.g. "/products".
  // Prepend "/api" so the product-service receives "/api/products".
  pathRewrite: (path) => `/api${path}`,
  onProxyReq: (proxyReq) => {
    proxyReq.setHeader('x-forwarded-service', 'api-gateway');
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure CORS headers are preserved from the backend service
    const origin = req.headers.origin;
    if (origin && [
      'http://localhost:3000',
      'http://localhost:5173', 
      'http://localhost:3001'
    ].includes(origin)) {
      proxyRes.headers['Access-Control-Allow-Origin'] = origin;
    }
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
  }
}));

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found in gateway' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Proxying /api -> ${PRODUCT_SERVICE_URL}`);
});


