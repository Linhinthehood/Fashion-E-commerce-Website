# Test Steps - Payment Service API

Hướng dẫn từng bước test Payment Service API với Postman.

## 📋 Prerequisites

1. ✅ Payment Service đang chạy trên `http://localhost:3004`
2. ✅ API Gateway đang chạy trên `http://localhost:3000`
3. ✅ Order Service đang chạy và có order để test
4. ✅ MongoDB đang kết nối
5. ✅ Postman đã được cài đặt

## 🚀 Setup Postman

### Bước 1: Import Collection

1. Mở Postman
2. Click **Import** (góc trên bên trái)
3. Chọn file `Payment Service.postman_collection.json`
4. Click **Import**

### Bước 2: Import Environment

1. Click **Import**
2. Chọn file `Payment Service.postman_environment.json`
3. Click **Import**
4. Chọn environment `Payment Service - Local` (góc trên bên phải)

### Bước 3: Update Environment Variables

Click vào environment `Payment Service - Local` và update:

| Variable | Value | Ví dụ |
|----------|-------|-------|
| `base_url` | `http://localhost:3000/api` | (giữ nguyên) |
| `payment_service_url` | `http://localhost:3004/api` | (giữ nguyên) |
| `order_id` | `your_order_id` | `507f1f77bcf86cd799439011` |
| `user_id` | `your_user_id` | `507f1f77bcf86cd799439012` |
| `payment_id` | (để trống, sẽ tự động fill) | |
| `token` | `your_jwt_token` | (nếu cần auth) |

## 🧪 Test Cases

### Test 1: Health Check

**Mục đích**: Kiểm tra Payment Service có đang chạy không

**Steps**:
1. Chọn request **Health Check**
2. Click **Send**
3. Kiểm tra response:
   ```json
   {
     "success": true,
     "message": "Payment service is running",
     "service": "payment-service"
   }
   ```

**Expected**: Status code `200`, response có `success: true`

---

### Test 2: Initiate Payment

**Mục đích**: Tạo payment cho một order

**Prerequisites**:
- Cần có `order_id` hợp lệ
- Order phải ở trạng thái `Pending`
- Order chưa được paid

**Steps**:
1. Chọn request **Initiate Payment**
2. Kiểm tra body có `order_id` đúng chưa
3. Click **Send**
4. Kiểm tra response:
   ```json
   {
     "success": true,
     "data": {
       "paymentId": "...",
       "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
       "status": "processing"
     }
   }
   ```
5. Copy `paymentUrl` để test thanh toán

**Expected**: 
- Status code `200`
- Response có `paymentUrl`
- `payment_id` tự động được lưu vào environment variable

**Lưu ý**: 
- Nếu order đã được paid → sẽ báo lỗi
- Nếu order không tồn tại → sẽ báo lỗi 404
- Nếu order không thuộc user → sẽ báo lỗi 403

---

### Test 3: Get Payment Status

**Mục đích**: Lấy thông tin payment status

**Prerequisites**:
- Cần có `payment_id` (từ Test 2)

**Steps**:
1. Chọn request **Get Payment Status**
2. Kiểm tra URL có `{{payment_id}}` (sẽ tự động lấy từ environment)
3. Click **Send**
4. Kiểm tra response:
   ```json
   {
     "success": true,
     "data": {
       "payment": {
         "_id": "...",
         "status": "processing",
         "amount": 100000,
         "gateway": "VNPay"
       }
     }
   }
   ```

**Expected**: 
- Status code `200`
- Response có payment information
- Status có thể là: `pending`, `processing`, `completed`, `failed`

---

### Test 4: Get User Payments

**Mục đích**: Lấy danh sách payments của user

**Prerequisites**:
- Cần có `user_id`

**Steps**:
1. Chọn request **Get User Payments**
2. Kiểm tra URL có `{{user_id}}`
3. Click **Send**
4. Kiểm tra response:
   ```json
   {
     "success": true,
     "data": {
       "payments": [...],
       "pagination": {
         "currentPage": 1,
         "totalPages": 1,
         "totalPayments": 1
       }
     }
   }
   ```

**Expected**: 
- Status code `200`
- Response có array of payments
- Có pagination information

**Test với filters**:
- Thêm `?status=completed` để filter by status
- Thêm `?gateway=VNPay` để filter by gateway
- Thêm `?page=1&limit=10` để pagination

---

### Test 5: Get Payment Statistics

**Mục đích**: Lấy payment statistics

**Steps**:
1. Chọn request **Get Payment Statistics**
2. Click **Send**
3. Kiểm tra response:
   ```json
   {
     "success": true,
     "data": {
       "general": {
         "totalPayments": 10,
         "totalAmount": 1000000,
         "completedAmount": 800000
       },
       "byStatus": [...],
       "byGateway": [...]
     }
   }
   ```

**Expected**: 
- Status code `200`
- Response có statistics data

**Test với filters**:
- Thêm `?userId=user_id` để filter by user
- Thêm `?startDate=2024-01-01&endDate=2024-12-31` để filter by date

---

## 💳 Test Payment Flow End-to-End

### Complete Flow Test

#### Step 1: Tạo Order (nếu chưa có)

**Endpoint**: `POST http://localhost:3000/api/orders`

**Body**:
```json
{
  "userId": "your_user_id",
  "addressId": "your_address_id",
  "paymentMethod": "Bank"
}
```

**Lưu `order_id` vào environment variable**

#### Step 2: Add Order Items

**Endpoint**: `POST http://localhost:3000/api/orders/items`

**Body**:
```json
{
  "orderId": "your_order_id",
  "items": [
    {
      "productId": "product_id",
      "variantId": "variant_id",
      "quantity": 1
    }
  ]
}
```

#### Step 3: Initiate Payment

1. Chọn request **Initiate Payment**
2. Update `order_id` trong body
3. Click **Send**
4. Copy `paymentUrl` từ response

#### Step 4: Test Payment trên VNPay

**Option 1: Test trên Browser**
1. Mở `paymentUrl` trong browser
2. Test thanh toán trên VNPay sandbox
3. Complete payment

**Option 2: Dùng VNPay Test Case Tool**
1. Đăng nhập: https://sandbox.vnpayment.vn/vnpaygw-sit-testing/user/login
2. Email: `duclinhhopham@gmail.com`
3. Test payment với test cases

#### Step 5: Verify Payment Status

1. Chọn request **Get Payment Status**
2. Click **Send**
3. Kiểm tra status đã chuyển sang `completed` chưa

#### Step 6: Verify Order Status

**Endpoint**: `GET http://localhost:3000/api/orders/{order_id}`

Kiểm tra `paymentStatus` đã chuyển sang `Paid` chưa

---

## 🔔 Test Webhook

### Test với ngrok

#### Step 1: Start ngrok

```bash
ngrok http 3004
```

Copy ngrok URL: `https://44b0ffe6f0fc.ngrok-free.app`

#### Step 2: Update IPN URL

1. Đăng nhập VNPay Merchant Admin: https://sandbox.vnpayment.vn/merchantv2/
2. Vào **Cấu hình** → **IPN URL**
3. Nhập: `https://44b0ffe6f0fc.ngrok-free.app/api/payments/webhooks/vnpay`
4. Lưu lại

#### Step 3: Update Environment Variable

Update `VNPAY_IPN_URL` trong `.env`:
```env
VNPAY_IPN_URL=https://44b0ffe6f0fc.ngrok-free.app/api/payments/webhooks/vnpay
```

#### Step 4: Restart Payment Service

```bash
# Restart service
npm run dev
# or
docker-compose restart payment-service
```

#### Step 5: Test Payment Flow

1. Initiate payment
2. Complete payment trên VNPay
3. Kiểm tra logs trong Payment Service
4. Kiểm tra webhook có được nhận không

### Test Webhook trong Postman

**Lưu ý**: Webhook test trong Postman sẽ fail signature verification vì cần tính toán đúng `vnp_SecureHash`.

**Để test đúng**:
1. Dùng VNPay test case tool để generate webhook data với signature đúng
2. Copy webhook data từ VNPay test case tool
3. Paste vào Postman webhook request
4. Send request

---

## 📊 Sample Test Data

### Sample Order ID

```json
{
  "orderId": "507f1f77bcf86cd799439011"
}
```

### Sample User ID

```json
{
  "userId": "507f1f77bcf86cd799439012"
}
```

### Sample Payment Initiate Request

```json
{
  "orderId": "507f1f77bcf86cd799439011",
  "gateway": "VNPay",
  "bankCode": "",
  "ipAddr": "127.0.0.1"
}
```

### Sample Webhook Data (Success)

```json
{
  "vnp_Amount": "10000000",
  "vnp_BankCode": "NCB",
  "vnp_BankTranNo": "VNP12345678",
  "vnp_CardType": "ATM",
  "vnp_OrderInfo": "Thanh toan don hang",
  "vnp_PayDate": "20240101120000",
  "vnp_ResponseCode": "00",
  "vnp_TmnCode": "PSF7UJW6",
  "vnp_TransactionNo": "12345678",
  "vnp_TransactionStatus": "00",
  "vnp_TxnRef": "payment_id",
  "vnp_SecureHash": "signature_here"
}
```

---

## ✅ Test Checklist

### Basic API Tests

- [ ] Health check endpoint works
- [ ] Initiate payment creates payment record
- [ ] Get payment status returns correct data
- [ ] Get user payments returns paginated results
- [ ] Get payment statistics returns correct data

### Payment Flow Tests

- [ ] Can initiate payment with valid order
- [ ] Payment URL is generated correctly
- [ ] Payment status updates after webhook
- [ ] Order status updates after payment completion
- [ ] Payment status updates after payment failure

### Webhook Tests

- [ ] Webhook accepts POST requests
- [ ] Webhook verifies signature correctly
- [ ] Webhook updates payment status
- [ ] Webhook updates order status
- [ ] Webhook handles duplicate requests (idempotent)
- [ ] Webhook rejects invalid signatures

### Error Handling Tests

- [ ] Returns error for invalid order ID
- [ ] Returns error for invalid payment ID
- [ ] Returns error for invalid user ID
- [ ] Returns error for invalid signature
- [ ] Returns error for missing required fields

---

## 🐛 Common Issues

### Issue 1: Payment không tạo được

**Symptoms**: 
- Error: "Order not found"
- Error: "Order is already paid"

**Solutions**:
1. Kiểm tra `order_id` có tồn tại không
2. Kiểm tra order chưa được paid
3. Kiểm tra Order Service có running không
4. Kiểm tra logs trong Payment Service

### Issue 2: Webhook không nhận được

**Symptoms**:
- Payment completed trên VNPay nhưng status không update
- Không thấy webhook logs

**Solutions**:
1. Kiểm tra ngrok có running không
2. Kiểm tra IPN URL trong VNPay Merchant Admin
3. Kiểm tra Payment Service logs
4. Kiểm tra firewall settings
5. Kiểm tra `VNPAY_IPN_URL` trong .env

### Issue 3: Signature verification failed

**Symptoms**:
- Webhook được nhận nhưng báo "Invalid signature"

**Solutions**:
1. Kiểm tra `VNPAY_HASH_SECRET` trong .env
2. Kiểm tra `VNPAY_TMN_CODE` trong .env
3. Kiểm tra webhook data không bị modify
4. Kiểm tra signature calculation

---

## 📚 Next Steps

Sau khi test xong các API cơ bản:

1. ✅ Test payment flow end-to-end
2. ✅ Test webhook với VNPay sandbox
3. ✅ Test error handling
4. ✅ Test với frontend integration
5. ✅ Test với production VNPay (khi deploy)

---

**Chúc bạn test thành công! 🎉**

