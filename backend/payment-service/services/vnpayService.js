const querystring = require('qs');
const crypto = require('crypto');
const { createVNPaySignature, verifyVNPaySignature, sortObject } = require('../utils/crypto');

class VNPayService {
  constructor(config) {
    this.tmnCode = config.tmnCode;
    this.hashSecret = config.hashSecret;
    this.url = config.url;
    this.returnUrl = config.returnUrl;
    this.ipnUrl = config.ipnUrl;
    this.locale = config.locale || 'vn';
    this.currCode = config.currCode || 'VND';
  }

  /**
   * Create payment URL
   * @param {Object} paymentData - Payment data
   * @param {String} paymentData.orderId - Order ID
   * @param {Number} paymentData.amount - Amount in VND
   * @param {String} paymentData.orderDescription - Order description
   * @param {String} paymentData.orderType - Order type
   * @param {String} paymentData.bankCode - Bank code (optional)
   * @param {String} paymentData.ipAddr - IP address
   * @returns {String} - Payment URL
   */
  createPaymentUrl(paymentData) {
    const {
      orderId,
      amount,
      orderDescription,
      orderType = 'other',
      bankCode = '',
      ipAddr
    } = paymentData;

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount: amount must be greater than 0');
    }

    // Ensure amount is integer
    const amountInt = Math.round(Number(amount));
    if (amountInt <= 0) {
      throw new Error('Invalid amount: amount must be greater than 0');
    }

    // Validate orderId (vnp_TxnRef)
    if (!orderId || orderId.length > 40) {
      throw new Error('Invalid orderId: must be provided and max 40 characters');
    }

    // Get current date in format: yyyyMMddHHmmss
    // VNPay requires date in Vietnam timezone (UTC+7)
    // Format: yyyyMMddHHmmss (no timezone conversion needed, just format correctly)
    const now = new Date();
    
    // Get Vietnam time (UTC+7)
    const vietnamOffset = 7 * 60; // UTC+7 in minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const vietnamTime = new Date(utc + (vietnamOffset * 60000));
    
    // Format: yyyyMMddHHmmss
    const year = vietnamTime.getFullYear();
    const month = String(vietnamTime.getMonth() + 1).padStart(2, '0');
    const day = String(vietnamTime.getDate()).padStart(2, '0');
    const hours = String(vietnamTime.getHours()).padStart(2, '0');
    const minutes = String(vietnamTime.getMinutes()).padStart(2, '0');
    const seconds = String(vietnamTime.getSeconds()).padStart(2, '0');
    const createDate = `${year}${month}${day}${hours}${minutes}${seconds}`;
    
    // Expire date: 15 minutes from now
    const expireTime = new Date(vietnamTime.getTime() + (15 * 60 * 1000));
    const expireYear = expireTime.getFullYear();
    const expireMonth = String(expireTime.getMonth() + 1).padStart(2, '0');
    const expireDay = String(expireTime.getDate()).padStart(2, '0');
    const expireHours = String(expireTime.getHours()).padStart(2, '0');
    const expireMinutes = String(expireTime.getMinutes()).padStart(2, '0');
    const expireSeconds = String(expireTime.getSeconds()).padStart(2, '0');
    const expireDate = `${expireYear}${expireMonth}${expireDay}${expireHours}${expireMinutes}${expireSeconds}`;

    // Clean orderDescription - VNPay orderInfo max 255 characters
    // Note: Do NOT URL encode here, qs.stringify will handle encoding
    let cleanOrderDescription = orderDescription || 'Thanh toan don hang';
    // Limit length to 255 characters
    cleanOrderDescription = cleanOrderDescription.substring(0, 255);
    // Remove null bytes and other problematic characters
    cleanOrderDescription = cleanOrderDescription.replace(/\0/g, '').trim();

    // Build payment parameters
    const vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: this.locale,
      vnp_CurrCode: this.currCode,
      vnp_TxnRef: orderId.substring(0, 40), // Max 40 characters
      vnp_OrderInfo: cleanOrderDescription,
      vnp_OrderType: orderType,
      vnp_Amount: amountInt * 100, // Convert to cents (VND doesn't have cents, but VNPay requires * 100)
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate
    };

    // Add bank code if provided (and not empty)
    if (bankCode && bankCode.trim() !== '') {
      vnp_Params.vnp_BankCode = bankCode.trim();
    }

    // Create signature first (using raw query string, no encoding)
    const signature = createVNPaySignature(vnp_Params, this.hashSecret);

    // Build query string for URL (VNPay accepts both encoded and non-encoded)
    // We'll build manually to ensure proper encoding for special characters
    const queryParams = [];
    const sortedKeys = Object.keys(vnp_Params).sort();
    
    for (const key of sortedKeys) {
      const value = vnp_Params[key];
      if (value !== '' && value !== null && value !== undefined) {
        // URL encode the value (especially for vnp_OrderInfo with Vietnamese characters)
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`);
      }
    }
    
    // Add signature
    queryParams.push(`vnp_SecureHash=${signature}`);
    
    // Build final URL
    const paymentUrl = `${this.url}?${queryParams.join('&')}`;

    // Log for debugging
    console.log('VNPay Payment URL created:', {
      txnRef: vnp_Params.vnp_TxnRef,
      amount: vnp_Params.vnp_Amount,
      createDate: vnp_Params.vnp_CreateDate,
      expireDate: vnp_Params.vnp_ExpireDate,
      orderInfo: vnp_Params.vnp_OrderInfo
    });

    return paymentUrl;
  }

  /**
   * Verify payment callback from VNPay
   * @param {Object} params - Query parameters from VNPay callback
   * @returns {Object} - Verification result
   */
  verifyPaymentCallback(params) {
    try {
      // Verify signature
      const isValid = verifyVNPaySignature(params, this.hashSecret);

      if (!isValid) {
        return {
          isValid: false,
          error: 'Invalid signature'
        };
      }

      // Extract payment information
      const responseCode = params.vnp_ResponseCode;
      const transactionStatus = params.vnp_TransactionStatus;
      const amount = parseInt(params.vnp_Amount) / 100; // Convert from cents
      const orderId = params.vnp_TxnRef;
      const transactionId = params.vnp_TransactionNo;
      const bankCode = params.vnp_BankCode || '';
      const cardType = params.vnp_CardType || '';
      const payDate = params.vnp_PayDate || '';
      const orderInfo = params.vnp_OrderInfo || '';

      // Determine payment status
      let status = 'failed';
      let message = 'Payment failed';

      if (responseCode === '00' && transactionStatus === '00') {
        status = 'completed';
        message = 'Payment successful';
      } else if (responseCode === '07') {
        status = 'failed';
        message = 'Trừ tiền thành công, giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)';
      } else if (responseCode === '09') {
        status = 'failed';
        message = 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking';
      } else if (responseCode === '10') {
        status = 'failed';
        message = 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần';
      } else if (responseCode === '11') {
        status = 'failed';
        message = 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch';
      } else if (responseCode === '12') {
        status = 'failed';
        message = 'Thẻ/Tài khoản bị khóa';
      } else if (responseCode === '13') {
        status = 'failed';
        message = 'Nhập sai mật khẩu xác thực giao dịch (OTP)';
      } else if (responseCode === '51') {
        status = 'failed';
        message = 'Tài khoản không đủ số dư để thực hiện giao dịch';
      } else if (responseCode === '65') {
        status = 'failed';
        message = 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày';
      } else if (responseCode === '75') {
        status = 'failed';
        message = 'Ngân hàng thanh toán đang bảo trì';
      } else if (responseCode === '79') {
        status = 'failed';
        message = 'Nhập sai mật khẩu thanh toán quá số lần quy định';
      } else {
        status = 'failed';
        message = `Payment failed with code: ${responseCode}`;
      }

      return {
        isValid: true,
        status,
        message,
        data: {
          orderId,
          transactionId,
          amount,
          bankCode,
          cardType,
          payDate,
          orderInfo,
          responseCode,
          transactionStatus,
          rawData: params
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Verify IPN (Instant Payment Notification) from VNPay
   * @param {Object} params - IPN parameters from VNPay
   * @returns {Object} - Verification result
   */
  verifyIPN(params) {
    return this.verifyPaymentCallback(params);
  }

  /**
   * Query transaction status from VNPay
   * @param {String} orderId - Order ID
   * @param {String} transactionDate - Transaction date (yyyyMMddHHmmss)
   * @returns {Object} - Query parameters (this would call VNPay API in production)
   */
  queryTransaction(orderId, transactionDate) {
    // This would typically call VNPay query API
    // For now, return query parameters structure
    const vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'querydr',
      vnp_TmnCode: this.tmnCode,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Query transaction ${orderId}`,
      vnp_TransactionDate: transactionDate,
      vnp_CreateDate: new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '')
    };

    const queryString = sortObject(vnp_Params);
    const signature = createVNPaySignature(vnp_Params, this.hashSecret);

    return {
      queryString: `${queryString}&vnp_SecureHash=${signature}`,
      params: vnp_Params
    };
  }

  /**
   * Refund transaction
   * @param {Object} refundData - Refund data
   * @param {String} refundData.orderId - Original order ID
   * @param {Number} refundData.amount - Refund amount
   * @param {String} refundData.transactionDate - Original transaction date
   * @param {String} refundData.transactionId - Original transaction ID
   * @param {String} refundData.refundDescription - Refund description
   * @returns {Object} - Refund parameters (this would call VNPay API in production)
   */
  createRefund(refundData) {
    const {
      orderId,
      amount,
      transactionDate,
      transactionId,
      refundDescription
    } = refundData;

    const vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: this.tmnCode,
      vnp_TransactionType: '03',
      vnp_TxnRef: orderId,
      vnp_Amount: amount * 100,
      vnp_OrderInfo: refundDescription || `Refund for order ${orderId}`,
      vnp_TransactionNo: transactionId,
      vnp_TransactionDate: transactionDate,
      vnp_CreateDate: new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', ''),
      vnp_CreateBy: 'merchant'
    };

    const queryString = sortObject(vnp_Params);
    const signature = createVNPaySignature(vnp_Params, this.hashSecret);

    return {
      queryString: `${queryString}&vnp_SecureHash=${signature}`,
      params: vnp_Params
    };
  }
}

module.exports = VNPayService;

