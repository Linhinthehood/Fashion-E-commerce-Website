# VNPay Setup Guide

Hướng dẫn setup và test VNPay integration.

## Cấu Hình VNPay Sandbox

### Thông Tin Sandbox

- **Terminal ID (vnp_TmnCode)**: `PSF7UJW6`
- **Secret Key (vnp_HashSecret)**: `7TJ22AUGF0LZCEWMMPYY1VFWB0OTO5HS`
- **Payment URL**: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- **Merchant Admin**: `https://sandbox.vnpayment.vn/merchantv2/`
- **Test Case URL**: `https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login`
- **Email**: `duclinhhopham@gmail.com`

### Environment Variables

Thêm vào file `.env`:

```env
# VNPay Configuration (Sandbox)
VNPAY_TMN_CODE=PSF7UJW6
VNPAY_HASH_SECRET=7TJ22AUGF0LZCEWMMPYY1VFWB0OTO5HS
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/api/payments/return/vnpay
VNPAY_IPN_URL=http://localhost:3004/api/payments/webhooks/vnpay
```

## Setup IPN URL cho Local Development

### Bước 1: Cài đặt ngrok

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start ngrok
ngrok http 3004
```

### Bước 2: Lấy ngrok URL

Sau khi chạy ngrok, bạn sẽ nhận được URL như:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3004
```

### Bước 3: Cấu hình IPN URL

1. **Update Environment Variable**:
   ```env
   VNPAY_IPN_URL=https://abc123.ngrok.io/api/payments/webhooks/vnpay
   ```

2. **Update trong VNPay Merchant Admin**:
   - Đăng nhập: https://sandbox.vnpayment.vn/merchantv2/
   - Vào **Cấu hình** → **IPN URL**
   - Nhập: `https://abc123.ngrok.io/api/payments/webhooks/vnpay`
   - Lưu lại

### Bước 4: Restart Payment Service

```bash
# Restart service để áp dụng environment variables mới
npm run dev
# or
docker-compose restart payment-service
```

## Testing Payment Flow

### 1. Tạo Order

Tạo một order trước khi test payment:

```bash
POST http://localhost:3000/api/orders
{
  "userId": "user_id_here",
  "addressId": "address_id_here",
  "paymentMethod": "Bank"
}
```

### 2. Initiate Payment

```bash
POST http://localhost:3000/api/payments/initiate
Content-Type: application/json

{
  "orderId": "order_id_here",
  "gateway": "VNPay",
  "ipAddr": "127.0.0.1"
}
```

Response:
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentId": "payment_id",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
    "orderId": "order_id",
    "amount": 100000,
    "currency": "VND",
    "gateway": "VNPay",
    "status": "processing"
  }
}
```

### 3. Redirect User to Payment URL

Frontend sẽ redirect user đến `paymentUrl` từ response.

### 4. Test Payment trên VNPay

Trên VNPay sandbox, bạn có thể test với:
- Test card numbers (xem VNPay documentation)
- Hoặc dùng tài khoản test

### 5. Verify Webhook

Sau khi thanh toán, VNPay sẽ gửi webhook đến IPN URL. Kiểm tra logs:

```bash
# Check Payment Service logs
docker-compose logs -f payment-service
```

Bạn sẽ thấy:
```
VNPay IPN received: { ... }
Payment status updated to completed
Order payment status updated to Paid
```

### 6. Verify Payment Status

```bash
GET http://localhost:3000/api/payments/{paymentId}
```

Response:
```json
{
  "success": true,
  "data": {
    "payment": {
      "_id": "payment_id",
      "orderId": "order_id",
      "status": "completed",
      "gatewayTransactionId": "transaction_id",
      "amount": 100000,
      "completedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Test Cases

### Test Case 1: Successful Payment

1. Initiate payment
2. Complete payment on VNPay
3. Verify webhook received
4. Verify payment status = "completed"
5. Verify order status = "Paid"

### Test Case 2: Failed Payment

1. Initiate payment
2. Cancel or fail payment on VNPay
3. Verify webhook received
4. Verify payment status = "failed"
5. Verify order status = "Failed"

### Test Case 3: Duplicate Webhook

1. Complete payment
2. VNPay sends webhook multiple times
3. Verify payment status remains "completed" (idempotent)

### Test Case 4: Invalid Signature

1. Send webhook with invalid signature
2. Verify webhook is rejected
3. Verify payment status is not updated

## Troubleshooting

### Webhook không nhận được

1. **Kiểm tra ngrok**:
   ```bash
   # Check ngrok is running
   curl http://localhost:4040/api/tunnels
   ```

2. **Kiểm tra IPN URL**:
   - Đảm bảo IPN URL đúng trong VNPay Merchant Admin
   - Đảm bảo IPN URL là public (ngrok URL)

3. **Kiểm tra Payment Service logs**:
   ```bash
   docker-compose logs -f payment-service
   ```

4. **Kiểm tra firewall**:
   - Đảm bảo port 3004 không bị block
   - Đảm bảo ngrok có thể access đến localhost:3004

### Signature verification failed

1. **Kiểm tra VNPAY_HASH_SECRET**:
   ```env
   VNPAY_HASH_SECRET=7TJ22AUGF0LZCEWMMPYY1VFWB0OTO5HS
   ```

2. **Kiểm tra VNPAY_TMN_CODE**:
   ```env
   VNPAY_TMN_CODE=PSF7UJW6
   ```

3. **Kiểm tra webhook data**:
   - Xem logs để kiểm tra webhook data
   - Đảm bảo data không bị modify

### Payment status không update

1. **Kiểm tra Order Service**:
   ```bash
   # Check Order Service is running
   curl http://localhost:3003/health
   ```

2. **Kiểm tra INTERNAL_SERVICE_TOKEN**:
   ```env
   INTERNAL_SERVICE_TOKEN=your_token_here
   ```

3. **Kiểm tra ORDER_SERVICE_URL**:
   ```env
   ORDER_SERVICE_URL=http://order-service:3003
   ```

## Production Setup

Khi deploy lên production:

1. **Update VNPay credentials**:
   - Sử dụng Production Terminal ID và Secret Key
   - Update trong environment variables

2. **Update IPN URL**:
   - Set IPN URL to production URL: `https://your-domain.com/api/payments/webhooks/vnpay`
   - Update trong VNPay Merchant Admin

3. **Update Return URL**:
   - Set Return URL to production URL: `https://your-domain.com/api/payments/return/vnpay`
   - Update trong environment variables

4. **Enable HTTPS**:
   - VNPay requires HTTPS for production
   - Ensure SSL certificate is configured

## Resources

- [VNPay Documentation](https://sandbox.vnpayment.vn/apis/)
- [VNPay Sandbox](https://sandbox.vnpayment.vn/)
- [VNPay Merchant Admin](https://sandbox.vnpayment.vn/merchantv2/)
- [VNPay Test Cases](https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login)

