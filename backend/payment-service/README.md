# Payment Service

Payment management microservice for fashion e-commerce with VNPay integration.

## Features

- ✅ VNPay integration (Sandbox/Production)
- ✅ Payment initiation
- ✅ Webhook handling (IPN)
- ✅ Return URL handling
- ✅ Payment status tracking
- ✅ Integration with Order Service
- ✅ Payment statistics

## Environment Variables

Create a `.env` file in the `backend/payment-service` directory with the following variables:

```env
# Server Configuration
PORT=3004
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/payments?retryWrites=true&w=majority

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Order Service Configuration
ORDER_SERVICE_URL=http://localhost:3003
INTERNAL_SERVICE_TOKEN=your_internal_service_token

# VNPay Configuration (Sandbox)
VNPAY_TMN_CODE=PSF7UJW6
VNPAY_HASH_SECRET=7TJ22AUGF0LZCEWMMPYY1VFWB0OTO5HS
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/api/payments/return/vnpay
VNPAY_IPN_URL=http://localhost:3004/api/payments/webhooks/vnpay
```

## VNPay Configuration

### Sandbox (Testing)
- **Terminal ID**: `PSF7UJW6`
- **Secret Key**: `7TJ22AUGF0LZCEWMMPYY1VFWB0OTO5HS`
- **Payment URL**: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- **Merchant Admin**: `https://sandbox.vnpayment.vn/merchantv2/`
- **Test Case URL**: `https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login`

### IPN URL Configuration

VNPay requires an IPN (Instant Payment Notification) URL to send payment status updates. 

**For Local Development:**
- Use ngrok to create a public URL: `ngrok http 3004`
- Set `VNPAY_IPN_URL` to your ngrok URL: `https://your-ngrok-url.ngrok.io/api/payments/webhooks/vnpay`
- Update this in VNPay Merchant Admin → Cấu hình → IPN URL

**For Production:**
- Set `VNPAY_IPN_URL` to your production URL: `https://your-domain.com/api/payments/webhooks/vnpay`
- Update this in VNPay Merchant Admin

## API Endpoints

### Payment Endpoints

#### Initiate Payment
```http
POST /api/payments/initiate
Content-Type: application/json

{
  "orderId": "order_id_here",
  "gateway": "VNPay",
  "bankCode": "", // Optional
  "ipAddr": "127.0.0.1" // Optional
}
```

#### Get Payment Status
```http
GET /api/payments/:id
```

#### Get User Payments
```http
GET /api/payments/user/:userId?page=1&limit=10&status=completed
```

#### Get Payment Statistics
```http
GET /api/payments/stats?userId=user_id&startDate=2024-01-01&endDate=2024-12-31
```

### Webhook Endpoints

#### VNPay IPN (Webhook)
```http
POST /api/payments/webhooks/vnpay
```

#### VNPay Return URL
```http
GET /api/payments/return/vnpay
```

## Payment Flow

1. **User initiates payment**:
   - Frontend calls `POST /api/payments/initiate` with orderId
   - Payment Service creates payment record
   - Payment Service generates VNPay payment URL
   - Frontend redirects user to VNPay payment page

2. **User completes payment on VNPay**:
   - User enters payment information on VNPay
   - VNPay processes payment

3. **VNPay sends IPN (Webhook)**:
   - VNPay sends POST request to `VNPAY_IPN_URL`
   - Payment Service verifies signature
   - Payment Service updates payment status
   - Payment Service updates order payment status in Order Service

4. **VNPay redirects user**:
   - VNPay redirects user to `VNPAY_RETURN_URL`
   - Payment Service verifies signature
   - Payment Service redirects user to frontend success/failure page

## Testing

### Test with Postman

Xem hướng dẫn chi tiết:
- **Quick Guide**: [QUICK_TEST_GUIDE.md](./QUICK_TEST_GUIDE.md)
- **Detailed Guide**: [POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md)

**Import Postman Collection**:
1. Import `Payment Service.postman_collection.json` vào Postman
2. Import `Payment Service.postman_environment.json` vào Postman
3. Setup environment variables
4. Start testing!

### Test with VNPay Sandbox

1. **Setup ngrok** (for local webhook testing):
   ```bash
   ngrok http 3004
   ```

2. **Update IPN URL**:
   - Copy ngrok URL: `https://your-ngrok-url.ngrok.io`
   - Set `VNPAY_IPN_URL` to: `https://your-ngrok-url.ngrok.io/api/payments/webhooks/vnpay`
   - Update in VNPay Merchant Admin → Cấu hình → IPN URL

3. **Test Payment Flow**:
   - Create an order
   - Initiate payment
   - Use VNPay test cards (see VNPay documentation)
   - Verify webhook is received
   - Verify payment status is updated

### Test Cards

VNPay Sandbox provides test cards. See VNPay documentation for test card numbers.

## Database Schema

### Payment Model

```javascript
{
  orderId: ObjectId,
  userId: ObjectId,
  gateway: String, // 'VNPay', 'MoMo', 'Stripe'
  amount: Number,
  currency: String, // 'VND', 'USD'
  status: String, // 'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
  gatewayTransactionId: String,
  gatewayOrderId: String,
  paymentUrl: String,
  returnUrl: String,
  ipnUrl: String,
  webhookData: Object,
  metadata: Object,
  failureReason: String,
  refundedAmount: Number,
  refundedAt: Date,
  completedAt: Date,
  failedAt: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## Integration with Order Service

Payment Service integrates with Order Service to update order payment status:

- When payment is completed → Order status updated to 'Paid'
- When payment fails → Order status updated to 'Failed'

## Security

- ✅ Webhook signature verification
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Input validation
- ✅ Error handling

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start

# Run tests
npm test
```

## Docker

```bash
# Build Docker image
docker build -t payment-service .

# Run Docker container
docker run -p 3004:3004 --env-file .env payment-service
```

## Troubleshooting

### Webhook not received
- Check IPN URL is correct in VNPay Merchant Admin
- Check ngrok is running (for local development)
- Check firewall/security settings
- Check webhook logs in Payment Service

### Payment status not updated
- Check Order Service is running
- Check INTERNAL_SERVICE_TOKEN is correct
- Check ORDER_SERVICE_URL is correct
- Check payment service logs

### Signature verification failed
- Check VNPAY_HASH_SECRET is correct
- Check VNPAY_TMN_CODE is correct
- Check webhook data is not modified

## Resources

- [VNPay Documentation](https://sandbox.vnpayment.vn/apis/)
- [VNPay Sandbox](https://sandbox.vnpayment.vn/)
- [VNPay Merchant Admin](https://sandbox.vnpayment.vn/merchantv2/)

