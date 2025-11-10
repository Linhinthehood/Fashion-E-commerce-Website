/**
 * Middleware to verify webhook requests
 * This can be extended to verify webhook signatures or IP whitelisting
 */
const verifyWebhook = (req, res, next) => {
  // For VNPay, signature verification is done in the controller
  // This middleware can be used for additional security checks like:
  // - IP whitelisting
  // - Rate limiting
  // - Request logging

  // Log webhook request
  console.log('Webhook received:', {
    method: req.method,
    path: req.path,
    ip: req.ip || req.headers['x-forwarded-for'],
    headers: req.headers,
    body: req.body
  });

  // Allow the request to proceed
  next();
};

/**
 * Middleware to verify webhook from VNPay IPs (optional)
 * VNPay IPs can be whitelisted here for additional security
 */
const verifyVNPayIP = (req, res, next) => {
  // VNPay IP ranges (this should be updated with actual VNPay IPs)
  // For now, we'll verify signature instead of IP
  // In production, you should whitelist VNPay IPs
  
  const vnpayIPs = [
    // Add VNPay IP ranges here if available
  ];

  const clientIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // If IP whitelist is configured, check it
  if (vnpayIPs.length > 0 && !vnpayIPs.some(ip => clientIP.includes(ip))) {
    console.warn('Webhook from unauthorized IP:', clientIP);
    // For now, we'll still allow it and verify signature instead
    // Uncomment below to enforce IP whitelist:
    // return res.status(403).json({ error: 'Unauthorized IP' });
  }

  next();
};

module.exports = {
  verifyWebhook,
  verifyVNPayIP
};

