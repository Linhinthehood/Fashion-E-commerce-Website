## Fashion Ecommerce - Hướng dẫn Routes (Tiếng Việt)

Tài liệu này mô tả cách chạy hệ thống và mục đích của từng route trong các service backend, cùng các helper API phía frontend.

### Cách chạy (local)

- Yêu cầu: Node.js 18+, chuỗi kết nối MongoDB trong file `.env` của từng service.
- Chạy từng service:
  - API Gateway (tùy chọn cho FE):
    - cd backend/api-gateway && npm install && npm run dev
  - User Service:
    - cd backend/user-service && npm install && npm run dev
  - Product Service:
    - cd backend/product-service && npm install && npm run dev
  - Order Service:
    - cd backend/order-service && npm install && npm run dev
  - Frontend:
    - cd frontend && npm install && npm run dev

Ghi chú môi trường:
- User Service mặc định: http://localhost:3001
- Product Service mặc định: http://localhost:3002
- Order Service mặc định: http://localhost:3003
- API Gateway mặc định: http://localhost:3000/api (nếu dùng)

Nếu dùng gọi nội bộ giữa service (order -> user), thiết lập `INTERNAL_SERVICE_TOKEN` ở cả hai service.

---

## Backend Services

### Order Service (`backend/order-service/routes/orders.js`)
- POST `/api/orders`
  - Body: `{ userId, addressId, paymentMethod: 'COD'|'Momo'|'Bank' }`
  - Mục đích: Tạo order (chưa có items). Xác thực user, customer, address thông qua user-service.

- POST `/api/orders/items`
  - Body: `{ orderId, items: [{ productId, variantId, quantity }] }`
  - Mục đích: Thêm các item vào order. Lấy product/variant từ product-service, kiểm tra variant thuộc product, giá = giá variant, kiểm tra tồn kho.

- POST `/api/orders/my-orders`
  - Body: `{ userId }`; Query: `page, limit, paymentStatus, shipmentStatus`
  - Mục đích: Danh sách đơn của người dùng với phân trang + lọc.

- POST `/api/orders/stats`
  - Body: `{ userId }`; Query: `startDate, endDate`
  - Mục đích: Thống kê tổng hợp theo người dùng.

- GET `/api/orders/:id`
  - Mục đích: Lấy chi tiết 1 đơn (kèm items), có thể giới hạn theo user đăng nhập khi tích hợp auth.

- PUT `/api/orders/:id/payment-status`
  - Body: `{ status: 'Pending'|'Paid'|'Failed'|'Refunded' }`
  - Mục đích: Cập nhật trạng thái thanh toán, lưu lịch sử.

- PUT `/api/orders/:id/shipment-status`
  - Body: `{ status: 'Pending'|'Packed'|'Delivered'|'Returned' }`
  - Mục đích: Cập nhật trạng thái giao hàng, lưu lịch sử.

- PUT `/api/orders/:id/discount`
  - Body: `{ discount }`
  - Mục đích: Áp dụng giảm giá, cập nhật finalPrice.

- GET `/api/orders`
  - Query: `page, limit, paymentStatus, shipmentStatus, startDate, endDate, sortBy, sortOrder`
  - Mục đích: (Admin) Liệt kê tất cả đơn với lọc/sắp xếp.

### Order Service - Analytics (`backend/order-service/routes/analytics.js`)
- GET `/api/orders/analytics/top-products`
  - Query: `period=day|month|year|all, date, limit, sortBy=quantity|revenue`
  - Mục đích: Top sản phẩm theo số lượng/ doanh thu.

- GET `/api/orders/analytics/orders-stats`
  - Query: `period=day|month|year|all, date`
  - Mục đích: Thống kê đơn hàng theo thời gian, phân bố trạng thái thanh toán/ giao hàng.

- GET `/api/orders/analytics/top-customers`
  - Query: `period=day|month|year|all, date, limit`
  - Mục đích: Top khách hàng theo doanh thu/số đơn.

- GET `/api/orders/analytics/overview`
  - Query: `period=day|month|year|all, date`
  - Mục đích: Tổng quan dashboard (doanh thu, AOV, paid orders,...).

### Order Service - Events (`backend/order-service/routes/events.js`)
- POST `/api/events/batch`
  - Body: `{ events: [ { type: 'view'|'add_to_cart'|'purchase'|'wishlist'|'search', sessionId, userId?, itemId?, variantId?, quantity?, price?, searchQuery?, context?, occurredAt? } ] }`
  - Mục đích: Nhận batch sự kiện hành vi để phục vụ gợi ý/phân tích.

- GET `/api/events/metrics`
  - Query: `startDate?, endDate?` (ISO date)
  - Mục đích: Đếm sự kiện theo ngày và loại (series) và tổng theo loại (totals).


### Product Service

Controllers: `controllers/productController.js`, `controllers/variantController.js`

Routes: `routes/products.js`
- GET `/api/products`
  - Query: `page, limit, categoryId, brand, gender, color, sortBy, sortOrder, search`
  - Mục đích: Danh sách sản phẩm có lọc + phân trang.

- POST `/api/products`
  - Multipart (ảnh tùy chọn), Body: `name, description, brand, gender, usage, categoryId, color, defaultPrice`
  - Mục đích: Tạo sản phẩm (có thể upload ảnh lên Cloudinary).

- GET `/api/products/:id`
  - Mục đích: Lấy sản phẩm theo id (kèm thông tin category, ảnh chính).

- PUT `/api/products/:id`
  - Mục đích: Cập nhật sản phẩm; có thể upload ảnh; cập nhật lại số lượng sản phẩm ở category.

- DELETE `/api/products/:id`
  - Mục đích: Xóa sản phẩm; cập nhật lại số lượng ở category.

- GET `/api/products/stats`
  - Mục đích: Thống kê tổng quan sản phẩm.

- GET `/api/products/category/:categoryId`
  - Mục đích: Lấy sản phẩm theo category.

- GET `/api/products/brand/:brand`
  - Mục đích: Lấy sản phẩm theo brand.

- GET `/api/products/gender/:gender`
  - Mục đích: Lấy sản phẩm theo giới tính.

Routes: `routes/variants.js`
- GET `/api/variants`
  - Query: `page, limit, productId, status, size, hasStock`
  - Mục đích: Danh sách biến thể (variant) có lọc + phân trang.

- POST `/api/variants`
  - Body: `{ productId, size, stock, status, price }`
  - Mục đích: Tạo variant cho sản phẩm (size là duy nhất trên mỗi product).

- GET `/api/variants/:id`
  - Mục đích: Lấy variant theo id (kèm tóm tắt product).

- PUT `/api/variants/:id`
  - Body: `size, stock, status, price, sku`
  - Mục đích: Cập nhật variant.

- DELETE `/api/variants/:id`
  - Mục đích: Xóa variant.

- GET `/api/variants/product/:productId`
  - Query: `status`
  - Mục đích: Lấy variant theo product (hữu ích cho chọn biến thể khi thêm vào đơn hàng).

- GET `/api/variants/size/:size`
  - Query: `status`
  - Mục đích: Lấy variant theo size.

- GET `/api/variants/available`
  - Mục đích: Lấy các variant đang Active và còn hàng (> 0).

- GET `/api/variants/low-stock`
  - Query: `threshold`
  - Mục đích: Lấy các variant Active có tồn kho ≤ ngưỡng.

- GET `/api/variants/out-of-stock`
  - Mục đích: Lấy các variant Active hết hàng (= 0).

- PATCH `/api/variants/:id/stock`
  - Body: `{ quantity }`
  - Mục đích: Điều chỉnh tồn kho theo delta.

- PATCH `/api/variants/:id/reserve`
  - Body: `{ quantity }`
  - Mục đích: Giữ chỗ (trừ tồn kho), không cho âm kho.

- PATCH `/api/variants/:id/release`
  - Body: `{ quantity }`
  - Mục đích: Trả tồn kho (cộng kho).


Routes: `routes/categories.js`
- GET `/api/categories`
  - Mục đích: Danh sách danh mục.

- POST `/api/categories`
  - Mục đích: Tạo danh mục mới.

- GET `/api/categories/:id`
  - Mục đích: Lấy danh mục theo id.

- PUT `/api/categories/:id`
  - Mục đích: Cập nhật danh mục.

- DELETE `/api/categories/:id`
  - Mục đích: Xóa danh mục.

- GET `/api/categories/:id/products`
  - Mục đích: Lấy sản phẩm theo danh mục, có phân trang.

- GET `/api/categories/master-categories`
  - Mục đích: Lấy danh sách master category.

- GET `/api/categories/sub-categories`
  - Query: `masterCategory`
  - Mục đích: Lấy danh sách sub-category theo master.

- GET `/api/categories/article-types`
  - Query: `masterCategory, subCategory`
  - Mục đích: Lấy danh sách article type theo master/sub.

- GET `/api/categories/stats`
  - Mục đích: Thống kê theo danh mục.

### User Service (`backend/user-service/routes/auth.js`, `customer.js`)

Routes: `auth.js`
- POST `/api/auth/register`
  - Mục đích: Đăng ký tài khoản.

- POST `/api/auth/login`
  - Mục đích: Đăng nhập; trả về token.

- GET `/api/auth/profile`
  - Yêu cầu: Bearer token
  - Mục đích: Lấy hồ sơ user hiện tại; nếu role là Customer sẽ kèm tóm tắt customer.

- PUT `/api/auth/profile`
  - Yêu cầu: Bearer token
  - Mục đích: Cập nhật hồ sơ (name, phoneNumber, avatar).

- PUT `/api/auth/change-password`
  - Yêu cầu: Bearer token
  - Mục đích: Đổi mật khẩu.

- GET `/api/auth/internal/user/:id`
  - Header: `x-service-token`
  - Mục đích: Tra cứu nội bộ giữa service (order-service sử dụng).

Routes: `customer.js`
- GET `/api/customers/profile`
  - Yêu cầu: Bearer + role Customer
  - Mục đích: Lấy hồ sơ khách hàng (địa chỉ, điểm thưởng).

- PUT `/api/customers/profile`
  - Yêu cầu: Bearer + role Customer
  - Mục đích: Cập nhật hồ sơ khách hàng (mảng địa chỉ).

- PUT `/api/customers/loyalty-points`
  - Yêu cầu: Bearer + role Customer
  - Body: `{ points, operation: 'add'|'subtract'|'set' }`
  - Mục đích: Điều chỉnh điểm thưởng.

- POST `/api/customers/addresses`
  - Yêu cầu: Bearer + role Customer
  - Mục đích: Thêm địa chỉ.

- PUT `/api/customers/addresses/:addressId`
  - Yêu cầu: Bearer + role Customer
  - Mục đích: Cập nhật địa chỉ.

- DELETE `/api/customers/addresses/:addressId`
  - Yêu cầu: Bearer + role Customer
  - Mục đích: Xóa địa chỉ.

- GET `/api/customers/all`
  - Yêu cầu: Bearer + role Admin
  - Mục đích: Liệt kê tất cả khách hàng, có phân trang.

- GET `/api/customers/:customerId`
  - Yêu cầu: Bearer + role Admin
  - Mục đích: Lấy khách hàng theo id.

- GET `/api/customers/internal/user/:userId`
  - Header: `x-service-token`
  - Mục đích: Tra cứu nội bộ customer theo userId (order-service dùng để xác thực địa chỉ).

---

## Frontend Helpers

### `frontend/src/utils/api.ts`
- Cung cấp `API_ENDPOINTS` cho các đường dẫn qua gateway; nhóm chính:
  - `auth`, `customers`, `products`, `categories`, `variants`, `orders`.
  - `events`: `batch()` → `/events/batch`, `metrics()` → `/events/metrics` (qua gateway).
- Nhóm `orders` đã khớp hợp đồng backend:
  - `create, addItems, myOrders, stats, byId, updatePaymentStatus, updateShipmentStatus, applyDiscount, adminAll`.

### `frontend/src/utils/apiService.ts`
- Bọc `fetch` với helpers có kiểu và export theo nhóm:
  - `authApi`, `customerApi`, `productApi`, `categoryApi`, `variantApi`, `orderApi`.
- `orderApi` map trực tiếp tới các route order-service:
  - `createOrder(payload)`: POST `/orders`
  - `addItems(payload)`: POST `/orders/items`
  - `getMyOrders(body, params)`: POST `/orders/my-orders`
  - `getMyStats(body, params)`: POST `/orders/stats`
  - `getById(id)`: GET `/orders/:id`
  - `adminGetAll(params)`: GET `/orders`
  - `updatePaymentStatus(id, body)`: PUT `/orders/:id/payment-status`
  - `updateShipmentStatus(id, body)`: PUT `/orders/:id/shipment-status`
  - `applyDiscount(id, body)`: PUT `/orders/:id/discount`

Ghi chú:
- Events hiện được gửi trực tiếp từ FE qua util `eventEmitter.ts` tới `/events/batch` (gateway → order-service). FE cũng có thể đọc metrics qua `API_ENDPOINTS.events.metrics()` để hiển thị ở Admin Dashboard.

---

## Ghi chú & Quy ước
- Giá trong OrderItem là giá của variant; `defaultPrice` của product chỉ để hiển thị mặc định.
- Order service không populate các model thuộc service khác (User/Address). Khi cần enrich, gọi API nội bộ tương ứng.
- Khi service phụ thuộc bị down, order-service trả 503 với mã lỗi/mô tả rõ ràng.


