## Fashion Ecommerce - Hướng dẫn Routes (Tiếng Việt)

Tài liệu này mô tả cách chạy hệ thống và mục đích của từng route trong các service backend, cùng các helper API phía frontend.

### Cách chạy (local)

- Yêu cầu: Node.js 18+, Python 3.8+ (cho fashion-service), chuỗi kết nối MongoDB trong file `.env` của từng service, Redis (cho caching).
- Chạy từng service:
  - API Gateway (tùy chọn cho FE):
    - cd backend/api-gateway && npm install && npm run dev
  - User Service:
    - cd backend/user-service && npm install && npm run dev
  - Product Service:
    - cd backend/product-service && npm install && npm run dev
  - Order Service:
    - cd backend/order-service && npm install && npm run dev
  - Fashion Service (Recommendation):
    - cd backend/fashion-service && pip install -r requirements.txt && python main.py
  - Redis:
    - docker-compose up redis (hoặc chạy Redis local)
  - Frontend:
    - cd frontend && npm install && npm run dev

Ghi chú môi trường:
- User Service mặc định: http://localhost:3001
- Product Service mặc định: http://localhost:3002
- Order Service mặc định: http://localhost:3003
- Fashion Service mặc định: http://localhost:3008
- Redis mặc định: localhost:6379
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

#### Event Ingestion
- POST `/api/events/batch`
  - Body: `{ events: [ { type: 'view'|'add_to_cart'|'purchase'|'wishlist'|'search'|'impression', sessionId, userId?, itemId?, itemIds?, variantId?, quantity?, price?, searchQuery?, context?, occurredAt? } ] }`
  - Context fields: `{ device?, geo?, page?, referrer?, source?, strategy?, position? }`
  - Mục đích: Nhận batch sự kiện hành vi để phục vụ gợi ý/phân tích. Hỗ trợ A/B testing với `context.source`, `context.strategy`, `context.position`.

#### Event Metrics
- GET `/api/events/metrics`
  - Query: `startDate?, endDate?` (ISO date)
  - Mục đích: Đếm sự kiện theo ngày và loại (series) và tổng theo loại (totals).

#### Event Aggregations
- GET `/api/events/aggregates/top-viewed`
  - Query: `startDate?, endDate?, limit?` (1-100)
  - Mục đích: Top sản phẩm được xem nhiều nhất.

- GET `/api/events/aggregates/popularity`
  - Query: `startDate?, endDate?, limit?` (1-200)
  - Mục đích: Popularity score (weighted: view=1, add_to_cart=2, purchase=5). Dùng cho hybrid scoring trong recommendations. Có Redis cache.

- GET `/api/events/aggregates/affinity`
  - Query: `userId` (required), `startDate?, endDate?, limit?` (1-500)
  - Mục đích: User affinity scores (weighted interactions per item). Dùng cho hybrid scoring trong recommendations. Có Redis cache.

#### Personalized Recommendations Support
- GET `/api/events/recent-items`
  - Query: `userId` (required), `limit?` (1-50), `days?` (1-365)
  - Mục đích: Lấy danh sách item IDs mà user đã tương tác gần đây (view/add_to_cart/purchase) để làm seed items cho personalized recommendations.

#### A/B Testing Metrics
- GET `/api/events/ab-test-metrics`
  - Query: `startDate?, endDate?, strategy?`
  - Mục đích: Tính metrics A/B test theo strategy: Impressions, Clicks, Add to Carts, Purchases, Revenue, CTR, ATC Rate, Conversion Rate, Revenue per Impression. Yêu cầu auth (Admin).

### Fashion Service (Recommendation) (`backend/fashion-service/main.py`)

#### Similar Products
- POST `/api/recommendations/similar`
  - Body: `{ productId, limit?, options?: { minSimilarity?, sameCategoryOnly?, priceTolerance?, filterGender?, filterUsage?, brandBoost? } }`
  - Mục đích: Tìm sản phẩm tương tự dựa trên visual similarity (FAISS) + business rules.

- GET `/api/recommendations/product/:productId`
  - Query: `limit?` (max 20), `sameCategoryOnly?`, `minSimilarity?`
  - Mục đích: Tìm sản phẩm tương tự (GET version của POST `/similar`).

#### Image Search
- POST `/api/recommendations/search-by-image`
  - Body: `{ imageUrl, limit?, options?: { minSimilarity? } }`
  - Mục đích: Tìm sản phẩm tương tự từ URL hình ảnh.

#### Personalized Recommendations (Hybrid Scoring)
- POST `/api/recommendations/retrieve/personalized`
  - Body: `{ recentItemIds: string[], userId?, limit?, alpha?, beta?, gamma? }`
  - Mục đích: Personalized recommendations với hybrid scoring:
    - `alpha`: Weight cho embedding similarity (default: 0.6)
    - `beta`: Weight cho popularity (default: 0.3)
    - `gamma`: Weight cho user affinity (default: 0.1)
    - Formula: `hybrid_score = α·normalized_embedding + β·normalized_popularity + γ·normalized_affinity`
  - Response: `{ candidates: [{ product, score, breakdown }], count, method, strategy?, weights? }`
  - Lưu ý: `userId` được gửi để fetch user affinity từ events API. Strategy weights (α,β,γ) có thể override cho A/B testing.

#### Batch Recommendations
- POST `/api/recommendations/batch`
  - Body: `{ productIds: string[] }` (max 10), `limit?`
  - Mục đích: Lấy recommendations cho nhiều products cùng lúc.

#### Service Stats
- GET `/api/recommendations/stats`
  - Mục đích: Thống kê service (mode, indexed products, device).

- GET `/health`
  - Mục đích: Health check endpoint.

### Product Service

Controllers: `controllers/productController.js`, `controllers/variantController.js`

Routes: `routes/products.js`
- GET `/api/products`
  - Query: `page, limit, categoryId, brand, gender, color, sortBy, sortOrder, search, minPrice?, maxPrice?`
  - Mục đích: Danh sách sản phẩm có lọc + phân trang. Hỗ trợ filter theo khoảng giá.

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

- GET `/api/products/master/:masterCategory/sub-category/:subCategory`
  - Query: `page, limit, brand?, gender?, color?, sortBy?, sortOrder?, search?, minPrice?, maxPrice?`
  - Mục đích: Lấy sản phẩm theo master category và sub-category, hỗ trợ filter đầy đủ.

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
Cung cấp `API_ENDPOINTS` cho các đường dẫn qua gateway. Các nhóm chính:

- **`auth`**: Register, login, profile, change password, Google OAuth
- **`customers`**: Profile, addresses, loyalty points, admin endpoints
- **`products`**: List, create, update, delete, search, by category/brand/gender, stats
- **`categories`**: List, master/sub-categories, article types, stats
- **`variants`**: List, create, update, delete, stock management
- **`orders`**: Create, add items, my orders, stats, admin endpoints
- **`analytics`**: Top products, orders stats, top customers, overview
- **`fashion`**: Similar products, personalized recommendations, image search, batch, stats
- **`events`**: 
  - `batch()` → `/events/batch`
  - `metrics()` → `/events/metrics`
  - `topViewed()` → `/events/aggregates/top-viewed`
  - `popularity()` → `/events/aggregates/popularity`
  - `affinity(userId)` → `/events/aggregates/affinity?userId=...`
  - `recentItems(userId, limit?, days?)` → `/events/recent-items?userId=...`
  - `abTestMetrics(startDate?, endDate?, strategy?)` → `/events/ab-test-metrics?...`

### `frontend/src/utils/apiService.ts`
Bọc `fetch` với helpers có kiểu và export theo nhóm:

- **`authApi`**: Register, login, profile, change password, Google OAuth
- **`customerApi`**: Profile, addresses, loyalty points, admin endpoints
- **`productApi`**: CRUD products, search, filter (bao gồm minPrice/maxPrice), stats
- **`categoryApi`**: CRUD categories, master/sub-categories, article types
- **`variantApi`**: CRUD variants, stock management
- **`orderApi`**: 
  - `createOrder(payload)`: POST `/orders`
  - `addItems(payload)`: POST `/orders/items`
  - `getMyOrders(body, params)`: POST `/orders/my-orders`
  - `getMyStats(body, params)`: POST `/orders/stats`
  - `getById(id)`: GET `/orders/:id`
  - `adminGetAll(params)`: GET `/orders`
  - `updatePaymentStatus(id, body)`: PUT `/orders/:id/payment-status`
  - `updateShipmentStatus(id, body)`: PUT `/orders/:id/shipment-status`
  - `applyDiscount(id, body)`: PUT `/orders/:id/discount`
- **`analyticsApi`**: Top products, orders stats, top customers, overview
- **`eventsApi`**: 
  - `getPopularity(params?)`: GET `/events/aggregates/popularity`
  - `getAffinity(userId, params?)`: GET `/events/aggregates/affinity?userId=...`
  - `getABTestMetrics(params?)`: GET `/events/ab-test-metrics` (yêu cầu auth)
- **`fashionApi`**: 
  - `getSimilarProducts(productId, params?)`: GET `/recommendations/product/:productId`
  - `findSimilarProducts(payload)`: POST `/recommendations/similar`
  - `searchByImage(payload)`: POST `/recommendations/search-by-image`
  - `getBatchRecommendations(payload)`: POST `/recommendations/batch`
  - `getStats()`: GET `/recommendations/stats`
  - `getPersonalizedRecommendations(userId, limit, strategyConfig?)`: POST `/recommendations/retrieve/personalized`
    - Tự động fetch `recentItemIds` từ `/events/recent-items`
    - Gửi `userId`, `recentItemIds`, và `alpha/beta/gamma` (nếu có) tới backend
    - Trả về `{ success, data, strategy, weights }`

### `frontend/src/utils/eventEmitter.ts`
Event emission utility với batching và strategy tracking:

- **`emitEvent(payload)`**: Thêm event vào queue, tự động batch và flush
  - Event types: `'view'`, `'add_to_cart'`, `'purchase'`, `'wishlist'`, `'search'`, `'impression'`
  - Context fields: `source`, `strategy`, `position` (cho A/B testing)
  - Tự động track strategy cho impression/view events
  - Tự động lookup strategy cho add_to_cart/purchase events
- **`flushEvents()`**: Flush events ngay lập tức (dùng sau purchase)
- **`getSessionId()`**: Lấy hoặc tạo session ID từ localStorage

### `frontend/src/utils/strategyTracker.ts`
Strategy tracking utility (sessionStorage-based):

- **`trackItemStrategy(itemId, context)`**: Lưu mapping `itemId → strategy` cho một item
- **`trackItemsStrategy(itemIds, context)`**: Lưu mapping cho nhiều items (từ impression)
- **`getItemStrategy(itemId)`**: Lookup strategy cho một item
- **`getItemsStrategy(itemIds)`**: Lookup strategy cho nhiều items (trả về most recent)
- **`clearStrategyMap()`**: Xóa tất cả mappings (dùng khi logout)

### `frontend/src/utils/abTesting.ts`
A/B Testing utilities:

- **`getUserStrategy(userId, sessionId)`**: Gán strategy (A/B/C) dựa trên consistent hashing
- **`getStrategyConfig(userId, sessionId)`**: Lấy full config cho strategy (alpha, beta, gamma)
- **`getStrategyIdentifier(config)`**: Generate strategy ID string (e.g., `hybrid-alpha0.6-beta0.3-gamma0.1`)
- **`isABTestingEnabled()`**: Check if A/B testing is enabled
- **Strategy variants**:
  - **A** (Content-Focused): α=0.6, β=0.3, γ=0.1 (20% users)
  - **B** (Trending-Focused): α=0.3, β=0.6, γ=0.1 (30% users)
  - **C** (Personalization-Focused): α=0.3, β=0.2, γ=0.5 (50% users)

---

## A/B Testing Workflow

1. **Strategy Assignment**: User được gán strategy (A/B/C) dựa trên hash của `userId` hoặc `sessionId`
2. **Recommendation Request**: Frontend gọi `getPersonalizedRecommendations()` với `strategyConfig` (alpha, beta, gamma)
3. **Impression Tracking**: Khi render recommendations, emit `impression` event với `{ source: 'recommendation', strategy, position }`
4. **Strategy Mapping**: Lưu `itemId → strategy` vào sessionStorage
5. **View Tracking**: Khi user click product, emit `view` event với strategy context
6. **Add to Cart/Purchase**: Tự động lookup strategy từ sessionStorage và attach vào events
7. **Metrics Calculation**: Backend `/events/ab-test-metrics` tính CTR, ATC Rate, Conversion Rate, Revenue per strategy
8. **Dashboard**: Admin Dashboard hiển thị metrics để so sánh strategies

---

## Ghi chú & Quy ước

- Giá trong OrderItem là giá của variant; `defaultPrice` của product chỉ để hiển thị mặc định.
- Order service không populate các model thuộc service khác (User/Address). Khi cần enrich, gọi API nội bộ tương ứng.
- Khi service phụ thuộc bị down, order-service trả 503 với mã lỗi/mô tả rõ ràng.
- Events được batch và flush mỗi 3 giây hoặc khi queue đạt 20 events.
- Strategy tracking sử dụng sessionStorage với TTL 7 ngày.
- Popularity và affinity scores được cache trong Redis để tăng performance.
- Hybrid scoring weights (α, β, γ) có thể được override cho A/B testing, nhưng tổng phải = 1.0.

---

**Cập nhật lần cuối**: 2025-11-08
