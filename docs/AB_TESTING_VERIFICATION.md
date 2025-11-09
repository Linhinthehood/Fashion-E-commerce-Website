# A/B Testing Verification Guide

## Workflow Overview

### 1. Event Tracking Flow

```
User Action → Frontend emitEvent() → Queue → Batch Send → Backend API → MongoDB
```

### 2. Events với Strategy (A/B Testing)

**Events có strategy:**
- ✅ **Home Recommendations** (`source: 'recommendation'`, `position: 'home-recommendations'`)
  - Có strategy identifier (e.g., `hybrid-alpha0.6-beta0.3-gamma0.1`)
  - Được assign dựa trên consistent hashing của userId/sessionId

- ✅ **Your Preferences Sidebar** (`source: 'recommendation'`, `position: 'sidebar-preferences'`)
  - Có strategy identifier (same as Home page)
  - Dựa trên user affinity scores

**Events KHÔNG có strategy (không phải A/B test):**
- ❌ **Trending Products Sidebar** (`source: 'recommendation'`, `position: 'sidebar-trending'`)
  - Không có strategy (chỉ là popularity-based, không phải A/B test)
  
- ❌ **Similar Products** (`source: 'recommendation'`, `position: 'product-detail-similar'`)
  - Không có strategy (chỉ là similarity-based, không phải A/B test)

- ❌ **Browse/Search/Category** (`source: 'browse'|'search'|'category'`)
  - Không có strategy (không phải recommendations)

### 3. Debug Logging

**Frontend Console (Browser DevTools):**
- `📊 A/B Testing Event:` - Khi emit event với source/strategy
- `🚀 Sending A/B Testing Events to backend:` - Khi gửi batch events
- `✅ Successfully sent X events to backend` - Khi gửi thành công

**Backend Console (Server logs):**
- `📊 Backend received A/B Testing Events:` - Khi nhận events với source/strategy
- `✅ Successfully saved X events to database (Y A/B test events)` - Khi lưu thành công

## Verification Steps

### Step 1: Check Frontend Events

1. Mở Browser DevTools (F12)
2. Vào tab **Console**
3. Vào trang Home (với user đã login)
4. Tìm logs:
   - `📊 A/B Testing Event:` - Xem có source, strategy, position không
   - `🚀 Sending A/B Testing Events to backend:` - Xem events có đầy đủ thông tin không

### Step 2: Check Backend Logs

1. Xem server logs (terminal hoặc Docker logs)
2. Tìm logs:
   - `📊 Backend received A/B Testing Events:` - Xem events có source, strategy, position không
   - `✅ Successfully saved X events to database` - Xác nhận events đã được lưu

### Step 3: Check Database

**Query MongoDB để kiểm tra:**

```javascript
// Check events với strategy
db.events.find({
  "context.strategy": { $exists: true, $ne: null }
}).limit(10).pretty()

// Check events với source='recommendation'
db.events.find({
  "context.source": "recommendation"
}).limit(10).pretty()

// Check impression events
db.events.find({
  type: "impression",
  "context.source": "recommendation"
}).limit(10).pretty()

// Check events với đầy đủ thông tin A/B testing
db.events.find({
  type: "impression",
  "context.source": "recommendation",
  "context.strategy": { $exists: true, $ne: null },
  "context.position": { $exists: true, $ne: null }
}).limit(10).pretty()

// Count events theo strategy
db.events.aggregate([
  {
    $match: {
      "context.strategy": { $exists: true, $ne: null }
    }
  },
  {
    $group: {
      _id: "$context.strategy",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
])
```

### Step 4: Check A/B Test Metrics API

```bash
# Get A/B test metrics
curl -X GET "http://localhost:5000/api/events/ab-test-metrics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get metrics với date range
curl -X GET "http://localhost:5000/api/events/ab-test-metrics?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get metrics cho strategy cụ thể
curl -X GET "http://localhost:5000/api/events/ab-test-metrics?strategy=hybrid-alpha0.6-beta0.3-gamma0.1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Expected Results

### Events với đầy đủ thông tin A/B testing:

```json
{
  "type": "impression",
  "itemIds": ["product-id-1", "product-id-2", ...],
  "context": {
    "source": "recommendation",
    "strategy": "hybrid-alpha0.6-beta0.3-gamma0.1",
    "position": "home-recommendations",
    "page": "/",
    "device": "web"
  },
  "userId": "user-id-123",
  "sessionId": "session-id-456",
  "occurredAt": "2024-01-01T00:00:00.000Z"
}
```

### Events view với strategy:

```json
{
  "type": "view",
  "itemId": "product-id-1",
  "context": {
    "source": "recommendation",
    "strategy": "hybrid-alpha0.6-beta0.3-gamma0.1",
    "position": "home-recommendations",
    "page": "/products/product-id-1",
    "device": "web"
  },
  "userId": "user-id-123",
  "sessionId": "session-id-456",
  "occurredAt": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Problem: Events không có strategy

**Nguyên nhân:**
1. User chưa login → không có userId → không tính được strategy
2. A/B testing chưa được enable
3. Events không phải từ recommendations (browse, search, category)

**Giải pháp:**
- Đảm bảo user đã login
- Check `isABTestingEnabled()` return `true`
- Chỉ events từ recommendations (Home, Your Preferences) mới có strategy

### Problem: Events không có source/position

**Nguyên nhân:**
1. ProductCard không được pass source/position props
2. Event được emit từ nơi khác (không phải ProductCard)

**Giải pháp:**
- Đảm bảo tất cả ProductCard được pass source và position
- Check console logs để xem events có đầy đủ thông tin không

### Problem: Backend không lưu context

**Nguyên nhân:**
1. validateAndNormalizeEvent không nhận được context
2. Context bị mất trong quá trình normalize

**Giải pháp:**
- Check backend logs để xem events có context không
- Check MongoDB để xem events có được lưu với context không

## Testing Checklist

- [ ] Home page recommendations emit impression events với strategy
- [ ] ProductCard click emit view events với source, strategy, position
- [ ] Your Preferences sidebar emit impression events với strategy
- [ ] Trending Products sidebar emit impression events (không có strategy)
- [ ] Similar Products emit impression events (không có strategy)
- [ ] Browse/Search/Category emit view events với source (không có strategy)
- [ ] Backend logs show events với đầy đủ context
- [ ] MongoDB có events với source, strategy, position
- [ ] A/B test metrics API return đúng data

## Next Steps

1. Test với nhiều users khác nhau
2. Verify strategy assignment consistency (same user → same strategy)
3. Check A/B test metrics trong Admin Dashboard
4. Analyze CTR, ATC, Conversion rates theo strategy

