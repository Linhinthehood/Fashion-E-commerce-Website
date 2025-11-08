# ĐẶC TẢ CƠ SỞ DỮ LIỆU - FASHION ECOMMERCE SYSTEM

## 📋 MỤC LỤC
1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc Database](#2-kiến-trúc-database)
3. [Chi tiết các Collections](#3-chi-tiết-các-collections)
4. [Quan hệ giữa các Collections](#4-quan-hệ-giữa-các-collections)
5. [Indexes và Performance](#5-indexes-và-performance)
6. [Constraints và Validations](#6-constraints-và-validations)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1. Hệ quản trị cơ sở dữ liệu
- **Database System**: MongoDB (NoSQL Document Database)
- **ODM (Object Document Mapper)**: Mongoose (Node.js)
- **Schema Validation**: Mongoose Schema với validation rules

### 1.2. Kiến trúc Microservices
Hệ thống được chia thành 4 services, mỗi service quản lý các collections riêng:

1. **User Service**: Quản lý người dùng, khách hàng, địa chỉ
2. **Product Service**: Quản lý sản phẩm, biến thể, danh mục
3. **Order Service**: Quản lý đơn hàng, chi tiết đơn hàng, sự kiện
4. **Fashion Service**: Xử lý recommendation (không có database riêng, sử dụng vector embeddings)

### 1.3. Danh sách Collections

| Service | Collections |
|---------|------------|
| **User Service** | `users`, `customers`, `addresses` |
| **Product Service** | `products`, `variants`, `categories` |
| **Order Service** | `orders`, `orderitems`, `events` |

**Tổng cộng**: 8 collections chính

---

## 2. KIẾN TRÚC DATABASE

### 2.1. Mô hình dữ liệu
- **Document-based**: Mỗi record là một document (JSON-like)
- **Schema validation**: Định nghĩa structure và validation rules
- **Relationships**: Sử dụng ObjectId references giữa các collections
- **Embedded data**: Một số dữ liệu được embed trực tiếp (ví dụ: paymentHistory trong Order)

### 2.2. Naming Convention
- **Collection names**: Plural, lowercase (ví dụ: `users`, `products`)
- **Field names**: camelCase (ví dụ: `userId`, `createdAt`)
- **ObjectId references**: Tên field kết thúc bằng `Id` (ví dụ: `userId`, `productId`)

---

## 3. CHI TIẾT CÁC COLLECTIONS

### 3.1. USER SERVICE COLLECTIONS

#### 3.1.1. Collection: `users`

**Mô tả**: Lưu trữ thông tin tài khoản người dùng (bao gồm customer, manager, stock clerk)

**Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary Key | ID tự động |
| `name` | String | ✅ | maxLength: 100, trim | Tên người dùng |
| `email` | String | ✅ | unique, lowercase, email format | Email đăng nhập |
| `password` | String | Conditional* | minLength: 6 | Mật khẩu (hashed) |
| `googleId` | String | ❌ | unique, sparse | Google OAuth ID |
| `dob` | Date | Conditional* | < current date | Ngày sinh |
| `phoneNumber` | String | Conditional* | regex: 9-12 digits | Số điện thoại |
| `gender` | String | Conditional* | enum: Male, Female, Others | Giới tính |
| `role` | String | ✅ | enum: Manager, Stock Clerk, Customer, default: Customer | Vai trò |
| `status` | String | ✅ | enum: Active, Inactive, Suspended, default: Active | Trạng thái |
| `avatar` | String | ❌ | - | URL avatar |
| `lastLogin` | Date | ❌ | - | Lần đăng nhập cuối |
| `createdAt` | Date | Auto | - | Ngày tạo |
| `updatedAt` | Date | Auto | - | Ngày cập nhật |

**Conditional Fields**: 
- `password`, `dob`, `phoneNumber`, `gender` chỉ required nếu không có `googleId` (Google OAuth users)

**Indexes:**
- `email`: unique index
- `googleId`: unique sparse index

**Methods:**
- `comparePassword(candidatePassword)`: So sánh mật khẩu
- `toJSON()`: Loại bỏ password khi serialize

**Pre-save Hooks:**
- Hash password trước khi lưu (nếu password được modify)

---

#### 3.1.2. Collection: `customers`

**Mô tả**: Lưu trữ thông tin chi tiết của khách hàng (mở rộng từ User)

**Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary Key | ID tự động |
| `userId` | ObjectId | ✅ | unique, ref: 'User' | Reference đến User |
| `addresses` | Array[ObjectId] | ❌ | ref: 'Address' | Danh sách địa chỉ |
| `loyaltyPoints` | Number | ❌ | min: 0, default: 0 | Điểm tích lũy |
| `isActive` | Boolean | ❌ | default: true | Trạng thái hoạt động |
| `createdAt` | Date | Auto | - | Ngày tạo |
| `updatedAt` | Date | Auto | - | Ngày cập nhật |

**Indexes:**
- `userId`: index (unique)
- `addresses`: index

**Validation:**
- User phải có role = 'Customer'
- Chỉ một Customer record cho mỗi User

**Static Methods:**
- `findByUserId(userId)`: Tìm customer theo userId
- `findWithUserDetails(filter)`: Tìm customer kèm thông tin user

---

#### 3.1.3. Collection: `addresses`

**Mô tả**: Lưu trữ địa chỉ giao hàng của khách hàng

**Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary Key | ID tự động |
| `name` | String | ✅ | maxLength: 100, trim | Tên địa chỉ (ví dụ: "Nhà riêng") |
| `addressInfo` | String | ✅ | maxLength: 500, trim | Chi tiết địa chỉ |
| `isDefault` | Boolean | ❌ | default: false | Địa chỉ mặc định |
| `isActive` | Boolean | ❌ | default: true | Trạng thái hoạt động |
| `createdAt` | Date | Auto | - | Ngày tạo |
| `updatedAt` | Date | Auto | - | Ngày cập nhật |

**Indexes:**
- `name`: index
- `isDefault`: index

**Relationships:**
- Được reference từ `customers.addresses` (many-to-many)

---

### 3.2. PRODUCT SERVICE COLLECTIONS

#### 3.2.1. Collection: `categories`

**Mô tả**: Lưu trữ danh mục sản phẩm (phân cấp 3 levels)

**Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary Key | ID tự động |
| `masterCategory` | String | ✅ | maxLength: 100, trim | Danh mục chính (ví dụ: "Apparel") |
| `subCategory` | String | ✅ | maxLength: 100, trim | Danh mục phụ (ví dụ: "Topwear") |
| `articleType` | String | ✅ | maxLength: 100, trim | Loại sản phẩm (ví dụ: "T-Shirt") |
| `description` | String | ❌ | maxLength: 500, trim | Mô tả danh mục |
| `isActive` | Boolean | ❌ | default: true | Trạng thái hoạt động |
| `productCount` | Number | ❌ | min: 0, default: 0 | Số lượng sản phẩm |
| `createdAt` | Date | Auto | - | Ngày tạo |
| `updatedAt` | Date | Auto | - | Ngày cập nhật |

**Indexes:**
- Compound: `{masterCategory: 1, subCategory: 1, articleType: 1}`
- `{masterCategory: 1, isActive: 1}`
- `{subCategory: 1, isActive: 1}`
- `{articleType: 1, isActive: 1}`

**Virtual Fields:**
- `path`: Trả về "masterCategory > subCategory > articleType"
- `fullName`: Trả về "masterCategory - subCategory - articleType"

**Static Methods:**
- `getByMasterCategory(masterCategory)`: Lấy categories theo master category
- `getMasterCategories()`: Lấy tất cả master categories
- `getSubCategories(masterCategory)`: Lấy sub categories
- `getArticleTypes(masterCategory, subCategory)`: Lấy article types

**Pre-save Hooks:**
- Cập nhật `productCount` khi `isActive` thay đổi

**Pre-remove Hooks:**
- Đánh dấu tất cả products trong category là `isActive: false`

---

#### 3.2.2. Collection: `products`

**Mô tả**: Lưu trữ thông tin sản phẩm

**Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary Key | ID tự động |
| `name` | String | ✅ | maxLength: 100, trim | Tên sản phẩm |
| `description` | String | ✅ | maxLength: 2000, trim | Mô tả sản phẩm |
| `brand` | String | ✅ | maxLength: 50, trim | Thương hiệu |
| `gender` | String | ✅ | enum: Male, Female, Unisex | Giới tính |
| `usage` | String | ✅ | maxLength: 100, trim | Mục đích sử dụng (ví dụ: "Casual", "Formal") |
| `color` | String | ✅ | maxLength: 50, trim | Màu sắc |
| `defaultPrice` | Number | ❌ | min: 0 | Giá mặc định |
| `images` | Array[String] | ❌ | - | Danh sách URL hình ảnh |
| `hasImage` | Boolean | ❌ | default: false | Có hình ảnh hay không |
| `categoryId` | ObjectId | ✅ | ref: 'Category' | Reference đến Category |
| `isActive` | Boolean | ❌ | default: true | Trạng thái hoạt động |
| `createdAt` | Date | Auto | - | Ngày tạo |
| `updatedAt` | Date | Auto | - | Ngày cập nhật |

**Indexes:**
- Text index: `{name: 'text', description: 'text'}` (full-text search)
- `{categoryId: 1, isActive: 1}`
- `{brand: 1, isActive: 1}`
- `{gender: 1, isActive: 1}`
- `{createdAt: -1, isActive: 1}`
- Compound: `{brand: 1, gender: 1, season: 1}`

**Virtual Fields:**
- `totalStock`: Tổng stock từ tất cả variants (active)
- `primaryImage`: Hình ảnh đầu tiên trong mảng images

**Methods:**
- `getVariants()`: Lấy tất cả variants của sản phẩm
- `hasActiveVariants()`: Kiểm tra có variants active không
- `getPrimaryImage()`: Lấy URL hình ảnh chính

**Static Methods:**
- `getByCategory(categoryId, limit)`: Lấy sản phẩm theo category
- `getByBrand(brand, limit)`: Lấy sản phẩm theo brand
- `getByGender(gender, limit)`: Lấy sản phẩm theo gender
- `search(query, filters)`: Tìm kiếm sản phẩm (text search)
- `getWithVariants(limit)`: Lấy sản phẩm kèm variants

---

#### 3.2.3. Collection: `variants`

**Mô tả**: Lưu trữ các biến thể của sản phẩm (size, stock, price)

**Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary Key | ID tự động |
| `productId` | ObjectId | ✅ | ref: 'Product' | Reference đến Product |
| `size` | String | ✅ | maxLength: 20, trim | Kích thước (ví dụ: "S", "M", "L", "40", "41") |
| `stock` | Number | ✅ | min: 0, default: 0 | Số lượng tồn kho |
| `status` | String | ✅ | enum: Active, Inactive, default: Active | Trạng thái |
| `price` | Number | ❌ | min: 0 | Giá (nếu khác với defaultPrice) |
| `sku` | String | ❌ | unique, sparse, uppercase | Mã SKU (tự động generate) |
| `createdAt` | Date | Auto | - | Ngày tạo |
| `updatedAt` | Date | Auto | - | Ngày cập nhật |

**Indexes:**
- `{productId: 1, status: 1}`
- `{size: 1, status: 1}`
- `{stock: 1, status: 1}`
- `{sku: 1}` (sparse)
- Compound: `{productId: 1, size: 1}`

**Virtual Fields:**
- `isAvailable`: `status === 'Active' && stock > 0`

**Methods:**
- `isInStock()`: Kiểm tra còn hàng
- `updateStock(quantity)`: Cập nhật stock
- `reserveStock(quantity)`: Giữ hàng (giảm stock)
- `releaseStock(quantity)`: Trả hàng (tăng stock)

**Static Methods:**
- `getByProduct(productId, status)`: Lấy variants theo product
- `getBySize(size, status)`: Lấy variants theo size
- `getAvailable()`: Lấy variants còn hàng
- `getLowStock(threshold)`: Lấy variants sắp hết hàng
- `getOutOfStock()`: Lấy variants hết hàng

**Pre-save Hooks:**
- Tự động generate SKU nếu chưa có: `{productId_suffix}-{SIZE_CODE}`

---

### 3.3. ORDER SERVICE COLLECTIONS

#### 3.3.1. Collection: `orders`

**Mô tả**: Lưu trữ thông tin đơn hàng

**Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary Key | ID tự động |
| `userId` | ObjectId | ✅ | ref: 'User' | Reference đến User |
| `totalPrice` | Number | ✅ | min: 0 | Tổng giá trị đơn hàng |
| `discount` | Number | ❌ | min: 0, default: 0 | Giảm giá |
| `finalPrice` | Number | ✅ | min: 0 | Giá cuối cùng (totalPrice - discount) |
| `paymentMethod` | String | ✅ | enum: COD, Momo, Bank, default: COD | Phương thức thanh toán |
| `paymentStatus` | String | ✅ | enum: Pending, Paid, Failed, Refunded, default: Pending | Trạng thái thanh toán |
| `paymentHistory` | Array[Object] | ❌ | - | Lịch sử thanh toán (embedded) |
| `shipmentStatus` | String | ✅ | enum: Pending, Packed, Delivered, Returned, default: Pending | Trạng thái vận chuyển |
| `shipmentHistory` | Array[Object] | ❌ | - | Lịch sử vận chuyển (embedded) |
| `itemCount` | Number | ❌ | min: 0, default: 0 | Số lượng sản phẩm |
| `addressId` | ObjectId | ✅ | - | Reference đến Address |
| `isActive` | Boolean | ❌ | default: true | Trạng thái hoạt động |
| `createdAt` | Date | Auto | - | Ngày tạo |
| `updatedAt` | Date | Auto | - | Ngày cập nhật |

**Embedded Schema: `paymentHistory`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | String | ✅ | Pending, Paid, Failed, Refunded |
| `updateAt` | Date | ✅ | Thời gian cập nhật |

**Embedded Schema: `shipmentHistory`**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | String | ✅ | Pending, Packed, Delivered, Returned |
| `updateAt` | Date | ✅ | Thời gian cập nhật |

**Indexes:**
- `{userId: 1, createdAt: -1}`
- `{paymentStatus: 1}`
- `{shipmentStatus: 1}`
- `{createdAt: -1}`
- `{finalPrice: -1}`

**Methods:**
- `generateOrderNumber()`: Tạo mã đơn hàng
- `updatePaymentStatus(newStatus)`: Cập nhật trạng thái thanh toán và thêm vào history
- `updateShipmentStatus(newStatus)`: Cập nhật trạng thái vận chuyển và thêm vào history
- `calculateFinalPrice()`: Tính giá cuối cùng

**Static Methods:**
- `getByUser(userId, options)`: Lấy đơn hàng theo user (có pagination, filter)
- `getOrderStats(userId, startDate, endDate)`: Lấy thống kê đơn hàng

**Pre-save Hooks:**
- Tự động tính `finalPrice = totalPrice - discount`
- Khởi tạo `paymentHistory` và `shipmentHistory` nếu chưa có

---

#### 3.3.2. Collection: `orderitems`

**Mô tả**: Lưu trữ chi tiết từng sản phẩm trong đơn hàng (snapshot tại thời điểm đặt hàng)

**Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary Key | ID tự động |
| `orderId` | ObjectId | ✅ | ref: 'Order' | Reference đến Order |
| `productId` | ObjectId | ✅ | ref: 'Product' | Reference đến Product |
| `variantId` | ObjectId | ✅ | ref: 'Variant' | Reference đến Variant |
| `productName` | String | ✅ | maxLength: 200, trim | Tên sản phẩm (snapshot) |
| `brand` | String | ✅ | maxLength: 100, trim | Thương hiệu (snapshot) |
| `color` | String | ✅ | maxLength: 50, trim | Màu sắc (snapshot) |
| `size` | String | ✅ | maxLength: 20, trim | Kích thước (snapshot) |
| `sku` | String | ❌ | uppercase, trim | Mã SKU (snapshot) |
| `variantStatus` | String | ✅ | enum: Active, Inactive, default: Active | Trạng thái variant (snapshot) |
| `price` | Number | ✅ | min: 0 | Giá tại thời điểm đặt hàng |
| `quantity` | Number | ✅ | min: 1, max: 100 | Số lượng |
| `subPrice` | Number | ✅ | min: 0 | Tổng giá (price * quantity) |
| `image` | String | ✅ | trim | URL hình ảnh (snapshot) |
| `categoryInfo` | Object | ✅ | - | Thông tin category (snapshot) |
| `categoryInfo.masterCategory` | String | ✅ | trim | Danh mục chính |
| `categoryInfo.subCategory` | String | ✅ | trim | Danh mục phụ |
| `categoryInfo.articleType` | String | ✅ | trim | Loại sản phẩm |
| `isActive` | Boolean | ❌ | default: true | Trạng thái hoạt động |
| `createdAt` | Date | Auto | - | Ngày tạo |
| `updatedAt` | Date | Auto | - | Ngày cập nhật |

**Indexes:**
- `{orderId: 1}`
- `{productId: 1}`
- `{variantId: 1}`
- `{'categoryInfo.masterCategory': 1}`
- `{'categoryInfo.subCategory': 1}`
- `{brand: 1}`
- `{color: 1}`
- `{size: 1}`
- `{sku: 1}`
- `{variantStatus: 1}`

**Virtual Fields:**
- `fullProductName`: "productName - color - Size size"
- `categoryPath`: "masterCategory > subCategory > articleType"

**Methods:**
- `calculateSubPrice()`: Tính subPrice = price * quantity

**Static Methods:**
- `getByOrder(orderId)`: Lấy order items theo order
- `getByProduct(productId, options)`: Lấy order items theo product
- `getByVariant(variantId)`: Lấy order items theo variant
- `getByBrand(brand, options)`: Lấy order items theo brand
- `getByCategory(categoryFilter, options)`: Lấy order items theo category
- `getPopularProducts(limit, startDate, endDate)`: Lấy sản phẩm phổ biến (aggregation)
- `getCategoryStats(startDate, endDate)`: Thống kê theo category (aggregation)
- `getBrandStats(startDate, endDate)`: Thống kê theo brand (aggregation)

**Pre-save Hooks:**
- Tự động tính `subPrice = price * quantity`

**Lưu ý quan trọng**: 
- Tất cả thông tin sản phẩm được lưu dưới dạng snapshot tại thời điểm đặt hàng
- Điều này đảm bảo tính nhất quán dữ liệu ngay cả khi sản phẩm bị thay đổi hoặc xóa sau này

---

#### 3.3.3. Collection: `events`

**Mô tả**: Lưu trữ các sự kiện tương tác của người dùng (để phục vụ recommendation và analytics)

**Schema:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `_id` | ObjectId | Auto | Primary Key | ID tự động |
| `userId` | String | ❌ | - | ID người dùng (có thể null cho anonymous) |
| `sessionId` | String | ✅ | - | ID phiên làm việc |
| `type` | String | ✅ | enum: view, add_to_cart, purchase, wishlist, search | Loại sự kiện |
| `itemId` | String | ❌ | - | ID sản phẩm |
| `variantId` | String | ❌ | - | ID variant |
| `quantity` | Number | ❌ | min: 1, default: 1 | Số lượng |
| `price` | Number | ❌ | min: 0 | Giá sản phẩm |
| `searchQuery` | String | ❌ | - | Từ khóa tìm kiếm (nếu type = search) |
| `context` | Object | ❌ | - | Ngữ cảnh sự kiện |
| `context.device` | String | ❌ | - | Thiết bị (web, mobile) |
| `context.geo` | String | ❌ | - | Địa lý (VN, US, ...) |
| `context.page` | String | ❌ | - | Trang hiện tại |
| `context.referrer` | String | ❌ | - | Nguồn referrer |
| `occurredAt` | Date | ✅ | - | Thời gian sự kiện xảy ra |
| `receivedAt` | Date | Auto | default: Date.now | Thời gian nhận được event |

**Indexes:**
- `{userId: 1, occurredAt: -1}`
- `{sessionId: 1, occurredAt: -1}`
- `{type: 1, occurredAt: -1}`

**Event Types:**
- `view`: Người dùng xem sản phẩm
- `add_to_cart`: Người dùng thêm vào giỏ hàng
- `purchase`: Người dùng mua hàng
- `wishlist`: Người dùng thêm vào wishlist
- `search`: Người dùng tìm kiếm

**Lưu ý**: 
- Collection này không có timestamps (tự quản lý `occurredAt` và `receivedAt`)
- Hỗ trợ anonymous users (userId có thể null)
- Dữ liệu được sử dụng cho recommendation pipeline và analytics

---

## 4. QUAN HỆ GIỮA CÁC COLLECTIONS

### 4.1. Sơ đồ quan hệ (ERD)

```
┌─────────────┐
│    User     │
│  (users)    │
└──────┬──────┘
       │ 1:1
       │
       ▼
┌─────────────┐     1:N     ┌─────────────┐
│  Customer   │─────────────▶│  Address    │
│ (customers) │             │ (addresses) │
└──────┬──────┘             └─────────────┘
       │
       │ N:1
       │
       ▼
┌─────────────┐
│   Order     │
│  (orders)   │
└──────┬──────┘
       │ 1:N
       │
       ▼
┌─────────────┐      N:1     ┌─────────────┐      N:1     ┌─────────────┐
│ OrderItem   │─────────────▶│  Product    │─────────────▶│  Category   │
│(orderitems) │             │ (products)  │             │ (categories)│
└──────┬──────┘             └──────┬──────┘             └─────────────┘
       │ N:1                       │ 1:N
       │                           │
       ▼                           ▼
┌─────────────┐             ┌─────────────┐
│  Variant    │◀────────────│  Product    │
│ (variants)  │   N:1       │ (products)  │
└─────────────┘             └─────────────┘

┌─────────────┐
│   Event     │
│  (events)   │──────┐
└─────────────┘      │ (references)
                     │ (userId, itemId, variantId)
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    ┌──────────┐         ┌──────────┐
    │   User   │         │ Product  │
    │ (users)  │         │(products)│
    └──────────┘         └──────────┘
```

### 4.2. Chi tiết quan hệ

#### 4.2.1. User Service Relationships

**User ↔ Customer (1:1)**
- Một User có thể có một Customer profile
- `customers.userId` → `users._id`
- Unique constraint trên `customers.userId`

**Customer ↔ Address (N:M)**
- Một Customer có thể có nhiều Address
- Một Address có thể thuộc nhiều Customer (trong tương lai)
- `customers.addresses` → Array of `addresses._id`

#### 4.2.2. Product Service Relationships

**Category ↔ Product (1:N)**
- Một Category có nhiều Products
- `products.categoryId` → `categories._id`

**Product ↔ Variant (1:N)**
- Một Product có nhiều Variants
- `variants.productId` → `products._id`

#### 4.2.3. Order Service Relationships

**User ↔ Order (1:N)**
- Một User có nhiều Orders
- `orders.userId` → `users._id`

**Order ↔ OrderItem (1:N)**
- Một Order có nhiều OrderItems
- `orderitems.orderId` → `orders._id`

**OrderItem ↔ Product (N:1)**
- Một OrderItem reference đến một Product
- `orderitems.productId` → `products._id`
- **Lưu ý**: Thông tin sản phẩm được snapshot, không phải live reference

**OrderItem ↔ Variant (N:1)**
- Một OrderItem reference đến một Variant
- `orderitems.variantId` → `variants._id`
- **Lưu ý**: Thông tin variant được snapshot

**Event ↔ User (N:1, Optional)**
- Events có thể có hoặc không có userId (anonymous users)
- `events.userId` → `users._id` (string, có thể null)

**Event ↔ Product (N:1, Optional)**
- Events có thể reference đến Product
- `events.itemId` → `products._id` (string)

**Event ↔ Variant (N:1, Optional)**
- Events có thể reference đến Variant
- `events.variantId` → `variants._id` (string)

---

## 5. INDEXES VÀ PERFORMANCE

### 5.1. Tổng quan Indexes

| Collection | Số lượng Indexes | Loại Indexes |
|------------|------------------|--------------|
| `users` | 2 | Unique (email, googleId) |
| `customers` | 2 | Standard (userId, addresses) |
| `addresses` | 2 | Standard (name, isDefault) |
| `categories` | 4 | Compound, Standard |
| `products` | 7 | Text, Compound, Standard |
| `variants` | 5 | Compound, Sparse, Standard |
| `orders` | 5 | Standard |
| `orderitems` | 9 | Standard |
| `events` | 3 | Standard |

### 5.2. Indexes quan trọng

#### 5.2.1. Text Search Index
**Collection**: `products`
```javascript
{ name: 'text', description: 'text' }
```
- Cho phép full-text search trên tên và mô tả sản phẩm
- Sử dụng MongoDB text search

#### 5.2.2. Compound Indexes
**Collection**: `categories`
```javascript
{ masterCategory: 1, subCategory: 1, articleType: 1 }
```
- Tối ưu query theo category hierarchy

**Collection**: `products`
```javascript
{ brand: 1, gender: 1, season: 1 }
{ categoryId: 1, isActive: 1 }
```
- Tối ưu filter queries

**Collection**: `variants`
```javascript
{ productId: 1, size: 1 }
{ productId: 1, status: 1 }
```
- Tối ưu query variants theo product

#### 5.2.3. Time-based Indexes
**Collection**: `orders`
```javascript
{ userId: 1, createdAt: -1 }
{ createdAt: -1 }
```
- Tối ưu query đơn hàng theo thời gian

**Collection**: `events`
```javascript
{ userId: 1, occurredAt: -1 }
{ sessionId: 1, occurredAt: -1 }
{ type: 1, occurredAt: -1 }
```
- Tối ưu query events theo thời gian

### 5.3. Performance Optimization

#### 5.3.1. Query Optimization
- Sử dụng indexes cho các query thường xuyên
- Sử dụng `select()` để chỉ lấy fields cần thiết
- Sử dụng `populate()` có chọn lọc (chỉ populate fields cần)

#### 5.3.2. Aggregation Pipelines
- Sử dụng aggregation cho analytics queries (OrderItem stats)
- Sử dụng `$match` sớm trong pipeline để giảm documents
- Sử dụng `$project` để giảm data transfer

#### 5.3.3. Caching Strategy
- Cache các queries thường xuyên (categories, popular products)
- Sử dụng Redis cho session data và temporary data

---

## 6. CONSTRAINTS VÀ VALIDATIONS

### 6.1. Unique Constraints

| Collection | Field | Constraint |
|------------|-------|------------|
| `users` | `email` | Unique |
| `users` | `googleId` | Unique (sparse) |
| `customers` | `userId` | Unique |
| `variants` | `sku` | Unique (sparse) |

### 6.2. Required Fields

Tất cả các collections đều có required fields được định nghĩa trong schema:
- Sử dụng `required: [true, 'message']` trong Mongoose schema
- Validation được thực hiện trước khi lưu vào database

### 6.3. Enum Constraints

| Collection | Field | Values |
|------------|-------|--------|
| `users` | `role` | Manager, Stock Clerk, Customer |
| `users` | `status` | Active, Inactive, Suspended |
| `users` | `gender` | Male, Female, Others |
| `products` | `gender` | Male, Female, Unisex |
| `variants` | `status` | Active, Inactive |
| `orders` | `paymentMethod` | COD, Momo, Bank |
| `orders` | `paymentStatus` | Pending, Paid, Failed, Refunded |
| `orders` | `shipmentStatus` | Pending, Packed, Delivered, Returned |
| `events` | `type` | view, add_to_cart, purchase, wishlist, search |

### 6.4. Data Type Validations

#### 6.4.1. String Validations
- **Email**: Regex pattern `/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/`
- **Phone Number**: Regex pattern `/^[\+]?[0-9]{9,12}$/`
- **Max Length**: Tùy theo field (50-2000 characters)
- **Trim**: Tự động loại bỏ khoảng trắng đầu/cuối

#### 6.4.2. Number Validations
- **Min Value**: Tất cả số không được âm (min: 0)
- **Max Value**: Một số fields có max (ví dụ: quantity max: 100)
- **Default Values**: Nhiều fields có giá trị mặc định

#### 6.4.3. Date Validations
- **Date of Birth**: Phải trong quá khứ (`date < new Date()`)
- **Timestamps**: Tự động tạo bởi Mongoose

### 6.5. Business Logic Validations

#### 6.5.1. Pre-save Hooks
- **User**: Hash password trước khi lưu
- **Customer**: Validate user role = 'Customer'
- **Variant**: Auto-generate SKU nếu chưa có
- **Order**: Auto-calculate finalPrice, initialize histories
- **OrderItem**: Auto-calculate subPrice
- **Category**: Update productCount khi isActive thay đổi

#### 6.5.2. Pre-remove Hooks
- **Category**: Mark all products as inactive khi category bị xóa

### 6.6. Referential Integrity

#### 6.6.1. ObjectId References
- Tất cả references sử dụng `mongoose.Schema.Types.ObjectId`
- Sử dụng `ref` để chỉ định collection
- Không có foreign key constraints (MongoDB không hỗ trợ)
- Phải validate references trong application logic

#### 6.6.2. Cascade Operations
- **Category deletion**: Mark products as inactive (pre-remove hook)
- **Product deletion**: Không có cascade (OrderItems giữ snapshot)
- **User deletion**: Cần xử lý manual (Customer, Orders)

---

## 7. DATA INTEGRITY VÀ BEST PRACTICES

### 7.1. Snapshot Pattern
- **OrderItem**: Lưu snapshot của Product và Variant tại thời điểm đặt hàng
- Đảm bảo tính nhất quán dữ liệu ngay cả khi sản phẩm bị thay đổi

### 7.2. Soft Delete
- Sử dụng `isActive` flag thay vì xóa vật lý
- Cho phép khôi phục và audit trail

### 7.3. Timestamps
- Tất cả collections có `createdAt` và `updatedAt` (trừ `events`)
- Tự động quản lý bởi Mongoose `timestamps: true`

### 7.4. Data Consistency
- Sử dụng transactions cho các operations phức tạp (nếu cần)
- Validate data ở application layer trước khi lưu
- Sử dụng middleware để đảm bảo data integrity

---

## 8. MIGRATION VÀ MAINTENANCE

### 8.1. Schema Evolution
- Mongoose hỗ trợ schema versioning
- Sử dụng migration scripts cho các thay đổi schema lớn
- Backward compatibility: Thêm fields mới với default values

### 8.2. Data Migration
- Sử dụng scripts để migrate dữ liệu
- Backup trước khi migration
- Test migration trên staging environment

### 8.3. Index Management
- Monitor index usage
- Remove unused indexes
- Rebuild indexes nếu cần

---

## 9. SECURITY CONSIDERATIONS

### 9.1. Password Security
- Passwords được hash bằng bcrypt (salt rounds: 12)
- Không lưu plain text passwords
- Password được loại bỏ khỏi JSON output

### 9.2. Data Access Control
- Sử dụng Mongoose middleware để filter sensitive data
- Implement role-based access control ở application layer
- Validate user permissions trước khi query

### 9.3. Input Validation
- Validate tất cả input ở application layer
- Sử dụng Mongoose validators
- Sanitize user input

---

## 10. MONITORING VÀ ANALYTICS

### 10.1. Query Performance
- Monitor slow queries
- Sử dụng MongoDB profiler
- Optimize indexes dựa trên query patterns

### 10.2. Data Growth
- Monitor collection sizes
- Implement data archival strategy
- Clean up old events data (nếu cần)

### 10.3. Analytics Collections
- `events` collection phục vụ analytics
- Aggregation pipelines cho reports
- Có thể tạo materialized views nếu cần

---

**Tác giả**: AI Assistant  
**Ngày tạo**: 2025-01-XX  
**Phiên bản**: 1.0  
**Cập nhật lần cuối**: 2025-01-XX

