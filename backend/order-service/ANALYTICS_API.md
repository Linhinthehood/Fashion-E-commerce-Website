# Analytics API Documentation

## Overview

Các API endpoints cho Admin Dashboard Analytics, cung cấp thống kê và báo cáo về doanh thu, sản phẩm và khách hàng.

## Base URL

```
/api/orders/analytics
```

## Endpoints

### 1. Get Top Products (Top sản phẩm bán chạy)

**GET** `/api/orders/analytics/top-products`

Lấy danh sách top sản phẩm được mua nhiều nhất theo khoảng thời gian.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `all` | Khoảng thời gian: `day`, `month`, `year`, `all` |
| `date` | string | No | - | Ngày cụ thể (format: `YYYY-MM-DD` cho day, `YYYY-MM` cho month, `YYYY` cho year) |
| `limit` | number | No | `10` | Số lượng sản phẩm trả về (1-100) |
| `sortBy` | string | No | `quantity` | Sắp xếp theo: `quantity` (số lượng) hoặc `revenue` (doanh thu) |

#### Example Request

```bash
# Top 10 sản phẩm bán chạy hôm nay
GET /api/orders/analytics/top-products?period=day&date=2024-01-15&limit=10

# Top 5 sản phẩm theo doanh thu tháng này
GET /api/orders/analytics/top-products?period=month&date=2024-01&limit=5&sortBy=revenue

# Top 20 sản phẩm tất cả thời gian
GET /api/orders/analytics/top-products?period=all&limit=20
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "topProducts": [
      {
        "productId": "507f1f77bcf86cd799439011",
        "productName": "Áo sơ mi nam",
        "brand": "Uniqlo",
        "image": "https://example.com/image.jpg",
        "totalQuantity": 150,
        "totalOrders": 120,
        "totalRevenue": 45000000
      }
    ],
    "period": "day",
    "date": "2024-01-15",
    "sortBy": "quantity",
    "limit": 10
  }
}
```

---

### 2. Get Orders Statistics (Thống kê đơn hàng)

**GET** `/api/orders/analytics/orders-stats`

Lấy thống kê tổng quan về đơn hàng: số lượng đơn, doanh thu, giá trị trung bình, và phân bố theo trạng thái.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `all` | Khoảng thời gian: `day`, `month`, `year`, `all` |
| `date` | string | No | - | Ngày cụ thể (format: `YYYY-MM-DD` cho day, `YYYY-MM` cho month, `YYYY` cho year) |

#### Example Request

```bash
# Thống kê đơn hàng hôm nay
GET /api/orders/analytics/orders-stats?period=day&date=2024-01-15

# Thống kê đơn hàng tháng này
GET /api/orders/analytics/orders-stats?period=month&date=2024-01

# Thống kê đơn hàng năm nay
GET /api/orders/analytics/orders-stats?period=year&date=2024
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "period": "day",
    "date": "2024-01-15",
    "overview": {
      "totalOrders": 250,
      "totalRevenue": 75000000,
      "averageOrderValue": 300000,
      "paidOrders": 200,
      "paidRevenue": 60000000
    },
    "byPaymentStatus": [
      { "status": "Paid", "count": 200 },
      { "status": "Pending", "count": 50 }
    ],
    "byShipmentStatus": [
      { "status": "Delivered", "count": 150 },
      { "status": "Packed", "count": 50 },
      { "status": "Pending", "count": 50 }
    ],
    "timeline": [
      { "period": 0, "orders": 10, "revenue": 3000000 },
      { "period": 1, "orders": 15, "revenue": 4500000 }
    ]
  }
}
```

**Timeline Notes:**
- `period=day`: timeline theo giờ (0-23)
- `period=month`: timeline theo ngày (1-31)
- `period=year`: timeline theo tháng (1-12)
- `period=all`: timeline theo ngày (YYYY-MM-DD)

---

### 3. Get Top Customers (Top khách hàng)

**GET** `/api/orders/analytics/top-customers`

Lấy danh sách top khách hàng mang lại doanh thu cao nhất.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `all` | Khoảng thời gian: `day`, `month`, `year`, `all` |
| `date` | string | No | - | Ngày cụ thể (format: `YYYY-MM-DD` cho day, `YYYY-MM` cho month, `YYYY` cho year) |
| `limit` | number | No | `10` | Số lượng khách hàng trả về (1-100) |

#### Example Request

```bash
# Top 10 khách hàng hôm nay
GET /api/orders/analytics/top-customers?period=day&date=2024-01-15&limit=10

# Top 5 khách hàng tháng này
GET /api/orders/analytics/top-customers?period=month&date=2024-01&limit=5
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "topCustomers": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "name": "Nguyễn Văn A",
        "email": "nguyenvana@example.com",
        "totalOrders": 25,
        "totalRevenue": 15000000,
        "averageOrderValue": 600000
      }
    ],
    "period": "day",
    "date": "2024-01-15",
    "limit": 10
  }
}
```

---

### 4. Get Dashboard Overview (Tổng quan dashboard)

**GET** `/api/orders/analytics/overview`

Lấy tất cả metrics trong một API call để hiển thị dashboard overview.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | string | No | `all` | Khoảng thời gian: `day`, `month`, `year`, `all` |
| `date` | string | No | - | Ngày cụ thể (format: `YYYY-MM-DD` cho day, `YYYY-MM` cho month, `YYYY` cho year) |

#### Example Request

```bash
# Overview hôm nay
GET /api/orders/analytics/overview?period=day&date=2024-01-15

# Overview tháng này
GET /api/orders/analytics/overview?period=month&date=2024-01
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "period": "day",
    "date": "2024-01-15",
    "overview": {
      "totalOrders": 250,
      "totalRevenue": 75000000,
      "averageOrderValue": 300000,
      "paidOrders": 200,
      "paidRevenue": 60000000
    },
    "topProducts": [
      {
        "productId": "507f1f77bcf86cd799439011",
        "productName": "Áo sơ mi nam",
        "brand": "Uniqlo",
        "image": "https://example.com/image.jpg",
        "totalQuantity": 150,
        "totalRevenue": 45000000
      }
    ],
    "topCustomers": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "name": "Nguyễn Văn A",
        "email": "nguyenvana@example.com",
        "totalOrders": 25,
        "totalRevenue": 15000000
      }
    ]
  }
}
```

**Note:** Endpoint này trả về top 5 products và top 5 customers để tối ưu performance. Để lấy đầy đủ danh sách, sử dụng endpoints riêng biệt.

---

## Date Format Examples

### Period: day
- Format: `YYYY-MM-DD`
- Example: `2024-01-15`

### Period: month
- Format: `YYYY-MM`
- Example: `2024-01`

### Period: year
- Format: `YYYY`
- Example: `2024`

### Period: all
- Không cần `date` parameter

---

## Error Responses

### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation errors",
  "errors": [
    {
      "msg": "Period must be day, month, year, or all",
      "param": "period",
      "location": "query"
    }
  ]
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details (only in development mode)"
}
```

---

## Testing Examples

### Using cURL

```bash
# Top products today
curl -X GET "http://localhost:3003/api/orders/analytics/top-products?period=day&date=2024-01-15&limit=10"

# Orders stats this month
curl -X GET "http://localhost:3003/api/orders/analytics/orders-stats?period=month&date=2024-01"

# Top customers this year
curl -X GET "http://localhost:3003/api/orders/analytics/top-customers?period=year&date=2024&limit=5"

# Dashboard overview
curl -X GET "http://localhost:3003/api/orders/analytics/overview?period=month&date=2024-01"
```

### Using Postman

1. **Top Products**
   - Method: `GET`
   - URL: `http://localhost:3003/api/orders/analytics/top-products`
   - Query Params:
     - `period`: `day`
     - `date`: `2024-01-15`
     - `limit`: `10`
     - `sortBy`: `quantity`

2. **Orders Stats**
   - Method: `GET`
   - URL: `http://localhost:3003/api/orders/analytics/orders-stats`
   - Query Params:
     - `period`: `month`
     - `date`: `2024-01`

3. **Top Customers**
   - Method: `GET`
   - URL: `http://localhost:3003/api/orders/analytics/top-customers`
   - Query Params:
     - `period`: `year`
     - `date`: `2024`
     - `limit`: `10`

4. **Dashboard Overview**
   - Method: `GET`
   - URL: `http://localhost:3003/api/orders/analytics/overview`
   - Query Params:
     - `period`: `day`
     - `date`: `2024-01-15`

---

## Performance Considerations

1. **Indexes**: Các queries sử dụng indexes có sẵn trên `createdAt`, `userId`, `productId`
2. **Aggregation**: Tất cả queries sử dụng MongoDB aggregation pipeline để tối ưu performance
3. **Caching**: Có thể implement caching cho các period cũ (tùy chọn)
4. **Parallel Processing**: Endpoint `overview` sử dụng `Promise.all()` để query song song

---

## Notes

- Tất cả endpoints trả về `success: true` khi thành công
- Revenue được làm tròn về số nguyên (VND)
- Nếu không có data, các arrays sẽ trả về rỗng `[]`
- User information trong `top-customers` có thể là `"Unknown User"` nếu user service không available

