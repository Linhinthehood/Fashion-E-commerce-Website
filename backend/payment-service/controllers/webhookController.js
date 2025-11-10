const Payment = require('../models/Payment');
const VNPayService = require('../services/vnpayService');
const OrderService = require('../services/orderService');

/**
 * Handle VNPay IPN (Instant Payment Notification)
 * @route POST /api/payments/webhooks/vnpay
 */
const handleVNPayWebhook = async (req, res) => {
  try {
    // VNPay sends webhook as URL-encoded form data or query string
    // Try to get from body first, then from query
    const params = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;

    console.log('VNPay IPN received:', {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: params
    });

    // Initialize VNPay service
    const vnpayService = new VNPayService({
      tmnCode: process.env.VNPAY_TMN_CODE,
      hashSecret: process.env.VNPAY_HASH_SECRET,
      url: process.env.VNPAY_URL,
      returnUrl: process.env.VNPAY_RETURN_URL,
      ipnUrl: process.env.VNPAY_IPN_URL,
      locale: 'vn',
      currCode: 'VND'
    });

    // Verify IPN
    const verification = vnpayService.verifyIPN(params);

    if (!verification.isValid) {
      console.error('Invalid VNPay IPN signature:', verification.error);
      return res.status(400).json({
        RspCode: '97',
        Message: 'Invalid signature'
      });
    }

    // Get payment from transaction reference (gatewayOrderId)
    // VNPay returns vnp_TxnRef which we stored in payment.gatewayOrderId
    const txnRef = params.vnp_TxnRef;
    let payment = await Payment.findOne({
      gatewayOrderId: txnRef,
      isActive: true
    });
    
    // Fallback: try to find by payment ID if gatewayOrderId doesn't match
    if (!payment) {
      try {
        // Try to find by _id if txnRef looks like a MongoDB ObjectId
        if (txnRef.match(/^[0-9a-fA-F]{24}$/)) {
          payment = await Payment.findById(txnRef);
        }
      } catch (err) {
        // Not a valid ObjectId, continue with null
      }
    }

    if (!payment) {
      console.error('Payment not found for txnRef:', txnRef);
      console.error('Received params:', params);
      return res.status(404).json({
        RspCode: '01',
        Message: 'Payment not found'
      });
    }

    // Check if payment is already processed
    if (payment.status === 'completed' && verification.status === 'completed') {
      console.log('Payment already completed:', payment._id.toString());
      return res.json({
        RspCode: '00',
        Message: 'Payment already processed'
      });
    }

    // Update payment with webhook data
    payment.webhookData = params;
    payment.gatewayTransactionId = verification.data.transactionId;
    payment.gatewayOrderId = params.vnp_TxnRef;

    // Update payment status
    const previousStatus = payment.status;
    payment.status = verification.status;

    if (verification.status === 'completed') {
      payment.completedAt = new Date();
    } else if (verification.status === 'failed') {
      payment.failedAt = new Date();
      payment.failureReason = verification.message;
    }

    await payment.save();

    // Update order payment status if payment is completed or failed
    if (verification.status === 'completed' && previousStatus !== 'completed') {
      try {
        const orderService = new OrderService(
          process.env.ORDER_SERVICE_URL,
          process.env.INTERNAL_SERVICE_TOKEN
        );

        await orderService.updatePaymentStatus(payment.orderId, 'Paid');
        console.log('Order payment status updated to Paid:', payment.orderId);
      } catch (error) {
        console.error('Failed to update order payment status:', error);
        // Don't fail the webhook if order update fails
        // Payment is already recorded, order can be updated manually
      }
    } else if (verification.status === 'failed' && previousStatus !== 'failed') {
      try {
        const orderService = new OrderService(
          process.env.ORDER_SERVICE_URL,
          process.env.INTERNAL_SERVICE_TOKEN
        );

        await orderService.updatePaymentStatus(payment.orderId, 'Failed');
        console.log('Order payment status updated to Failed:', payment.orderId);
      } catch (error) {
        console.error('Failed to update order payment status:', error);
      }
    }

    // Return success response to VNPay
    res.json({
      RspCode: '00',
      Message: 'Success'
    });
  } catch (error) {
    console.error('VNPay webhook error:', error);
    res.status(500).json({
      RspCode: '99',
      Message: 'Internal server error'
    });
  }
};

/**
 * Handle VNPay return URL (user redirects back from VNPay)
 * @route GET /api/payments/return/vnpay
 */
const handleVNPayReturn = async (req, res) => {
  try {
    const params = req.query;

    console.log('VNPay return URL received:', params);

    // Initialize VNPay service
    const vnpayService = new VNPayService({
      tmnCode: process.env.VNPAY_TMN_CODE,
      hashSecret: process.env.VNPAY_HASH_SECRET,
      url: process.env.VNPAY_URL,
      returnUrl: process.env.VNPAY_RETURN_URL,
      ipnUrl: process.env.VNPAY_IPN_URL,
      locale: 'vn',
      currCode: 'VND'
    });

    // Verify payment callback
    const verification = vnpayService.verifyPaymentCallback(params);

    if (!verification.isValid) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=invalid_signature`);
    }

    // Get payment from transaction reference
    const txnRef = params.vnp_TxnRef;
    let payment = await Payment.findOne({
      gatewayOrderId: txnRef,
      isActive: true
    });
    
    // Fallback: try to find by payment ID
    if (!payment) {
      try {
        if (txnRef.match(/^[0-9a-fA-F]{24}$/)) {
          payment = await Payment.findById(txnRef);
        }
      } catch (err) {
        // Not a valid ObjectId
      }
    }

    if (!payment) {
      console.error('Payment not found for txnRef:', txnRef);
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=payment_not_found`);
    }

    const paymentId = payment._id.toString();

    // Redirect to frontend based on payment status
    if (verification.status === 'completed') {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/success?paymentId=${paymentId}&orderId=${payment.orderId}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?paymentId=${paymentId}&error=${encodeURIComponent(verification.message)}`);
    }
  } catch (error) {
    console.error('VNPay return URL error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=internal_error`);
  }
};

module.exports = {
  handleVNPayWebhook,
  handleVNPayReturn
};

