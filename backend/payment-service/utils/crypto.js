const crypto = require('crypto');
const querystring = require('qs');

/**
 * Sort object by key and create query string (for signature calculation)
 * VNPay requires query string WITHOUT URL encoding for signature
 * @param {Object} obj - Object to sort
 * @param {Boolean} encode - Whether to URL encode (default: false for signature)
 * @returns {String} - Sorted query string
 */
function sortObject(obj, encode = false) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    const value = obj[key];
    // Skip empty values, null, undefined
    if (value === '' || value === null || value === undefined) {
      continue;
    }
    sorted[key] = value;
  }
  
  // For signature: use encode: false (raw values)
  // For URL: use encode: true (URL encoded)
  return querystring.stringify(sorted, { encode: encode });
}

/**
 * Create VNPay signature
 * @param {Object} params - Payment parameters
 * @param {String} secretKey - VNPay secret key
 * @returns {String} - SHA256 signature
 */
function createVNPaySignature(params, secretKey) {
  // Remove signature and empty values
  const cleanParams = {};
  for (const key in params) {
    if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && params[key] !== '' && params[key] !== null && params[key] !== undefined) {
      cleanParams[key] = params[key];
    }
  }
  
  // Sort and create query string WITHOUT encoding (for signature calculation)
  // VNPay requires raw query string for signature
  const queryString = sortObject(cleanParams, false);
  
  // Create HMAC SHA512
  const hmac = crypto.createHmac('sha512', secretKey);
  hmac.update(queryString, 'utf8');
  
  return hmac.digest('hex');
}

/**
 * Verify VNPay signature
 * @param {Object} params - Payment parameters from VNPay
 * @param {String} secretKey - VNPay secret key
 * @returns {Boolean} - True if signature is valid
 */
function verifyVNPaySignature(params, secretKey) {
  const vnp_SecureHash = params.vnp_SecureHash;
  
  if (!vnp_SecureHash) {
    return false;
  }
  
  // Create signature from params
  const signature = createVNPaySignature(params, secretKey);
  
  // Compare signatures
  return signature === vnp_SecureHash;
}

/**
 * Create MD5 hash (for backward compatibility if needed)
 * @param {String} data - Data to hash
 * @returns {String} - MD5 hash
 */
function createMD5Hash(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Create SHA256 hash
 * @param {String} data - Data to hash
 * @returns {String} - SHA256 hash
 */
function createSHA256Hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
  sortObject,
  createVNPaySignature,
  verifyVNPaySignature,
  createMD5Hash,
  createSHA256Hash
};

