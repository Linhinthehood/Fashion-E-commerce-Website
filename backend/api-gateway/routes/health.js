const express = require('express');
const { getServiceHealth } = require('../middleware/proxy');

const router = express.Router();

// Get overall health status
router.get('/', (req, res) => {
  const serviceHealth = getServiceHealth();
  const allHealthy = Object.values(serviceHealth).every(status => status === true);
  
  const status = allHealthy ? 'healthy' : 'degraded';
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: true,
    message: `API Gateway is ${status}`,
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: '1.0.0',
    status,
    services: serviceHealth
  });
});

// Get detailed health status
router.get('/detailed', (req, res) => {
  const serviceHealth = getServiceHealth();
  const allHealthy = Object.values(serviceHealth).every(status => status === true);
  
  const status = allHealthy ? 'healthy' : 'degraded';
  const statusCode = allHealthy ? 200 : 503;

  const serviceDetails = Object.entries(serviceHealth).map(([serviceName, isHealthy]) => ({
    name: serviceName,
    status: isHealthy ? 'healthy' : 'unhealthy',
    lastChecked: new Date().toISOString()
  }));

  res.status(statusCode).json({
    success: true,
    message: `API Gateway is ${status}`,
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    version: '1.0.0',
    status,
    services: serviceDetails
  });
});

module.exports = router;
