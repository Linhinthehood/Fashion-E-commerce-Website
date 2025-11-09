# Recommendation Events Pipeline - Progress & Workflow

## 1) Scope (Phase 0–2)
- Build minimal events pipeline for recommendations:
  - Unified event schema (view, add_to_cart, purchase, wishlist, search)
  - API Gateway endpoint to ingest events (batched)
  - Backend route to validate + persist events to MongoDB
  - Frontend event emitter with batching and session handling
- Next: add monitoring/metrics and wire search/purchase events

## 2) High-Level Workflow
1. Frontend captures user interactions -> adds to local queue
2. Every 3s (or size>=20), frontend sends `POST /api/events/batch`
3. API Gateway proxies `/api/events/*` -> order-service
4. Order-service validates, normalizes, and persists to `events` collection
5. Data is available for analytics and future model training/serving

## 3) What’s Implemented
- Backend (order-service)
  - Model: `Event` with indices by `userId`, `sessionId`, `type`, `occurredAt`
  - Controller: batch ingest with normalization and basic validation
  - Route: `POST /api/events/batch`
  - Server: mounted `/api/events`
- API Gateway
  - Proxy: `/api/events` -> order-service
- Frontend
  - `eventEmitter.ts`: queue, batch(20), flush(3s), unload flush, sessionId
  - Wired in `ProductDetail.tsx`: emit `view` on load, `add_to_cart` on add

## 4) Files Changed (by area)
- API Gateway
  - `backend/api-gateway/server.js` (proxy `/api/events`)
- Order Service
  - `backend/order-service/models/Event.js`
  - `backend/order-service/controllers/eventsController.js`
  - `backend/order-service/routes/events.js`
  - `backend/order-service/server.js` (mount route)
- Frontend
  - `frontend/src/utils/eventEmitter.ts` (new)
  - `frontend/src/pages/ProductDetail.tsx` (wire events)

## 5) API Contract
- Ingest events (batch)
  - `POST /api/events/batch`
  - Body:
    ```json
    {
      "events": [
        {
          "type": "view|add_to_cart|purchase|wishlist|search",
          "sessionId": "sess-...",
          "userId": "optional",
          "itemId": "optional",
          "variantId": "optional",
          "quantity": 1,
          "price": 123000,
          "searchQuery": "optional",
          "context": { "device": "web", "page": "/p/123", "geo": "VN", "referrer": "..." },
          "occurredAt": "2025-11-03T10:00:00Z"
        }
      ]
    }
    ```
  - Responses: 201 `{ success: true, ingested: N }`

## 6) Frontend Emission Points
- Product Detail
  - onLoad: `view`
  - onAddToCart: `add_to_cart` with `itemId`, `variantId`, `quantity`, `price`
- Planned next
  - Search page: `search` (query, result count)
  - Post-order success: `purchase` (items, total)

## 7) Monitoring (Planned)
- Add minimal metrics logs to order-service ingest (counts per type/day)
- Add simple analytics endpoint for event counts (for dashboard)
- Later: push to OLAP (ClickHouse/BigQuery) for deeper analysis

## 8) Checklist / Status
- [x] Define unified event schema and validation
- [x] API Gateway forwarding `/api/events`
- [x] Backend events route to persist batched events
- [x] Frontend lightweight event emitter + batching
- [x] Basic monitoring/metrics for pipeline
- [x] Wire `search` event (frontend)
- [x] Wire `purchase` event (backend hook + frontend trigger)
- [x] Dashboard: simple event counts for admin (integrated in DashboardAnalytics.tsx)
- [x] Aggregation endpoints: `/api/events/aggregates/popularity`, `/api/events/aggregates/affinity`, `/api/events/aggregates/top-viewed`

## 9) Next Steps (Execution Order)
1. Add ingest metrics + simple aggregation endpoint in order-service ✅
2. Wire `search` events in frontend search component ✅
3. Emit `purchase` after successful order workflow ✅
4. Implement Retrieval (Stage 1) service ✅
5. Implement A/B testing flags and monitoring dashboards ✅
6. ~~Implement Ranking (Stage 2) service~~ ⏭️ SKIPPED (not needed for ~100 products)
7. ~~Orchestrate end-to-end `/recommendations` with business rules/diversity~~ 🔄 SIMPLIFIED (basic rules only)
8. Optional: add retries/backoff and dead-letter handling (future)
9. **Current Focus**: Collect A/B test data và analyze results to optimize strategy weights

## 10) Monitoring API
- `GET /api/events/metrics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "series": [
          { "day": "2025-11-03", "type": "view", "count": 123 },
          { "day": "2025-11-03", "type": "add_to_cart", "count": 12 }
        ],
        "totalsByType": { "view": 123, "add_to_cart": 12 }
      }
    }
    ```

## 11) Phase 3 — Retrieval (Stage 1)
- Goal: lấy danh sách ứng viên nhanh (10–200 ids) theo ngữ cảnh/nguời dùng.
- Reuse `fashion-service` to serve ANN via FAISS index (already present `cloud_gallery_ip.index`).
- Endpoints (fashion-service):
  - `GET /recommendations/similar?itemId=...&topK=50` (đã có tương tự)
  - `GET /recommendations/retrieve/personalized?userId=...&topK=100`
    - Inputs: `userId` (optional), `recentItemIds[]` (from events), `category`, `priceRange`
    - Logic: hybrid score = α·embeddingSim + β·popularity + γ·categoryAffinity
- Data sources:
  - Item embeddings (đã có), popularity (events metrics: count view/add_to_cart/purchase), user affinities (aggregate từ events theo category/brand).
- Deliverables:
  - Build aggregation jobs in order-service for popularity/affinities (daily + hourly update)
  - Cache online in Redis (key: `popularity:*`, `affinity:user:*`)

## 12) Phase 4 — Ranking (Stage 2)
- Goal: sắp xếp ứng viên tối ưu CTR/ATC/Conversion.
- Model v1 (simple): XGBoost/LightGBM với features:
  - User: category/brand affinity, price sensitivity (avg spend), recency
  - Item: price, category, brand, popularity, stock
  - Context: time of day, device, geo
  - Cross: similarity score from retrieval, same-category flag
- Serving:
  - Expose `POST /recommendations/rank` (fashion-service or new `ranking-service`)
  - Load model via ONNX/TorchScript; latency < 50ms
- Training pipeline (batch):
  - Build labeled dataset from events (positive: clicks/add_to_cart/purchase; negatives: impressions without interactions)
  - Split train/val; log metrics (AUC, NDCG@K)

## 13) Phase 5 — Orchestrator + Business Rules
- API Gateway orchestrates:
  - `GET /api/recommendations?userId=...&context=...`
  - Steps: retrieve → rank → diversify → filter stock/blacklist → return
- Diversification: MMR/xQuAD to avoid redundancy; caps per brand/category; optional price banding.
- Caching: short‑TTL per user/session (Redis) to reduce tail latency.

## 14) Phase 6 — A/B Testing & Monitoring ✅ COMPLETED
- ✅ Feature flags: User routing to different strategies (A, B, C) based on consistent hashing
- ✅ Event tracking: Strategy context tracking với `source`, `strategy`, `position` fields
- ✅ Strategy tracking system: SessionStorage-based mapping để truy vết strategy từ impression → view → add_to_cart → purchase
- ✅ Online metrics: CTR, ATC, Conversion, Revenue; by strategy
- ✅ Dashboards: Admin Dashboard với A/B Test metrics table
- ✅ Backend metrics API: `/api/events/ab-test-metrics` endpoint

## 15) Phase 7 — Privacy, Compliance, Governance
- Pseudonymize `userId` nếu cần; honor consent/opt‑out.
- TTL cho raw behavioral events; role‑based access for metrics.
- Document data lineage (events → features → models → serving).

## 16) New APIs to Implement (Summary)
- Retrieval:
  - `GET /recommendations/retrieve/personalized` (fashion-service)
- Ranking:
  - `POST /recommendations/rank` (ranking model)
- Orchestrated:
  - `GET /api/recommendations` (gateway) → orchestrates retrieve+rank+diversify
- Aggregations (order-service or dedicated analytics):
  - `GET /api/events/aggregates/popularity?window=7d`
  - `GET /api/events/aggregates/affinity?userId=...`

## 17) Implementation Checklist

### Phase 3: Retrieval ✅
- [x] Retrieval: personalized retrieve endpoint using embeddings (✅ `/api/recommendations/retrieve/personalized` exists)
- [x] Retrieval: integrate popularity scores from events into hybrid scoring (α·embeddingSim + β·popularity + γ·userAffinity) ✅
- [x] Aggregation endpoints: popularity (view/add_to_cart/purchase weighted) ✅
- [x] Aggregation endpoints: user affinity by itemId ✅
- [x] Redis caching for popularity/affinity ✅
- [ ] Aggregation endpoints: user affinity by category/brand (optional, currently only by itemId)
- [ ] Aggregation jobs: daily/hourly scheduled jobs to pre-compute popularity/affinity (optional, currently on-demand)

### Phase 4: Ranking ⏭️ SKIPPED
- [ ] ~~Ranking API skeleton with pluggable scorer~~ (not needed for ~100 products)

### Phase 5: Orchestrator 🔄 SIMPLIFIED
- [ ] ~~Orchestrated `/api/recommendations` in gateway with diversification~~ (basic rules only, not needed)

### Phase 6: A/B Testing ✅
- [x] A/B flags to toggle models/pipelines ✅
- [x] Strategy assignment: User routing to different strategies (A, B, C) ✅
- [x] Event tracking: Strategy context tracking với `source`, `strategy`, `position` ✅
- [x] Strategy tracking system: SessionStorage-based mapping ✅
- [x] Admin dashboard: A/B Test Dashboard với CTR/ATC/Conversion metrics ✅
- [x] Backend metrics API: `/api/events/ab-test-metrics` ✅

### Phase 7: Privacy ❌ FUTURE
- [ ] Privacy: add opt‑out flag and client respect flow (future work)

## 18) Simple “Grade‑5” Explanations — Goals and Outcomes
- Phase 0–2: Events & Monitoring
  - Mục tiêu (Goal): Ghi lại bạn làm gì (xem, tìm kiếm, thêm giỏ, mua) và đếm số lần.
  - Kết quả (Outcome): Có sổ tay vài trang ghi hoạt động mỗi ngày, để sau này học cách đoán sở thích.

- Phase 3: Retrieval (Nhặt nhanh)
  - Mục tiêu: Từ cả cửa hàng, chọn nhanh một nhóm món “có vẻ hợp gu”.
  - Kết quả: Một danh sách ngắn (ví dụ 50 món) để xem xét kỹ hơn.

- Phase 4: Ranking (Chấm điểm/xếp hạng)
  - Mục tiêu: Sắp xếp nhóm món đó từ hợp nhất đến ít hợp.
  - Kết quả: Danh sách gợi ý “hợp gu” nhất ở trên cùng để bạn bấm vào.

- Phase 5: Orchestrator + Luật kinh doanh
  - Mục tiêu: Ghép các bước lại (nhặt → chấm → đa dạng), bỏ món hết hàng, tôn trọng quy tắc cửa hàng.
  - Kết quả: Gợi ý vừa hợp gu vừa thực tế (còn hàng, đa dạng thương hiệu/giá).

- Phase 6: A/B Testing & Monitoring (Thử nghiệm công bằng) ✅
  - Mục tiêu: So sánh các cách gợi ý khác nhau (strategy A, B, C) xem cách nào tốt hơn (nhiều người bấm/mua hơn).
  - Kết quả: Chọn được cách "giỏi" hơn dựa trên số liệu (CTR, ATC Rate, Conversion Rate, Revenue).
  - Cách hoạt động:
    1. User được assign vào một strategy (A, B, hoặc C) dựa trên ID
    2. Recommendations được tạo với strategy weights tương ứng
    3. Events (impression, view, add_to_cart, purchase) được track với strategy
    4. Backend tính metrics (CTR, ATC Rate, Conversion Rate) theo strategy
    5. Admin Dashboard hiển thị metrics để so sánh strategies

- Phase 7: Privacy (Riêng tư)
  - Mục tiêu: Bảo vệ danh tính, chỉ dùng ID ẩn danh, tôn trọng quyền tắt theo dõi.
  - Kết quả: Người dùng yên tâm, dữ liệu dùng đúng mục đích và có hạn sử dụng.

## 19) Current Status Summary (Updated: 2025-11-03)

### ✅ Phase 0-2: Events Pipeline — HOÀN THÀNH
- **Events Infrastructure**: ✅ Complete
  - Event model with validation
  - Batch ingest endpoint (`POST /api/events/batch`)
  - Frontend event emitter with batching (20 items or 3s flush)
  - API Gateway proxy configured
  
- **Monitoring & Analytics**: ✅ Complete
  - Metrics endpoint (`GET /api/events/metrics`)
  - Aggregation endpoints:
    - `GET /api/events/aggregates/popularity` (weighted by event type)
    - `GET /api/events/aggregates/affinity?userId=...` (user-item affinity)
    - `GET /api/events/aggregates/top-viewed` (top viewed products)
  - Admin dashboard integration (DashboardAnalytics.tsx)

- **Event Wiring**: ✅ Complete
  - `view` events in ProductDetail.tsx
  - `add_to_cart` events in ProductDetail.tsx
  - `search` events in ProductsPage.tsx
  - `purchase` events in CartPage.tsx

### ✅ Phase 3: Retrieval (Stage 1) — HOÀN THÀNH (HYBRID SCORING IMPLEMENTED)
- **Endpoint**: ✅ `/api/recommendations/retrieve/personalized` exists
- **Current Implementation**:
  - ✅ Uses FAISS embeddings for similarity search
  - ✅ Aggregates candidates from multiple seed items
  - ✅ **DONE**: Integrate popularity scores from events (`/api/events/aggregates/popularity`)
  - ✅ **DONE**: Integrate user affinity by itemId (`/api/events/aggregates/affinity?userId=...`)
  - ✅ **DONE**: Hybrid scoring implemented (α·embeddingSim + β·popularity + γ·userAffinity)
  - ✅ **DONE**: EventsAPIClient to fetch popularity/affinity from order-service
  - ✅ **DONE**: Normalized scoring and configurable weights (alpha, beta, gamma)

- **Implementation Details**:
  - Hybrid score: `score = α·normalizedEmbedding + β·normalizedPopularity + γ·normalizedAffinity`
  - Default weights: α=0.6 (embedding), β=0.3 (popularity), γ=0.1 (affinity)
  - Scores are normalized to [0, 1] range before combining
  - Response includes score breakdown for debugging
  - Falls back to popularity-only if no recent items provided
  - Falls back gracefully if events API is unavailable

- **Remaining Optimizations** (Optional):
  - Redis cache for popularity/affinity (currently on-demand API calls)
  - Scheduled aggregation jobs (daily/hourly) to pre-compute metrics
  - Category/brand-level user affinity (currently only itemId-level, requires product category mapping)

### ⏭️ Phase 4: Ranking (Stage 2) — BỎ QUA (KHÔNG CẦN THIẾT)
- **Status**: **Skipped** - Not needed for ~100 products
- **Reason**: 
  - Phase 3 hybrid scoring (embedding + popularity + affinity) is sufficient for small catalog
  - ML model (XGBoost/LightGBM) would be overkill:
    - Requires large training dataset (insufficient events for 100 products)
    - Complex feature engineering and training pipeline
    - Latency overhead not worth the marginal improvement
    - **Cost > Benefit for this scale**
- **Alternative**: Current hybrid scoring in Phase 3 already provides good ranking
- **When to Revisit**: If catalog grows to 1000+ products or events data becomes substantial

### 🔄 Phase 5: Orchestrator + Business Rules — ĐƠN GIẢN HÓA (OPTIONAL)
- **Status**: **Simplified** - Basic business rules only, skip complex orchestration
- **What to Keep** (Simple - Already Done or Easy):
  - ✅ Stock filtering (already in product service)
  - ✅ Redis caching (already implemented in Phase 3)
  - ⚠️ Basic diversification: max items per brand/category (can add in retrieval if needed)
- **What to Skip** (Overkill):
  - ❌ Complex MMR/xQuAD diversification algorithms
  - ❌ Dedicated orchestrator service
  - ❌ Complex business rules engine
  - ❌ Separate ranking service
- **Recommendation**: 
  - Add simple diversification in `retrieve_personalized()` if needed (e.g., max 2 items per brand)
  - Not worth building a separate orchestrator service for 100 products
  - Can be added later if catalog scales significantly

### ✅ Phase 6: A/B Testing & Monitoring — HOÀN THÀNH
- **Status**: **COMPLETED** ✅
- **Why Important**:
  - Compare different recommendation strategies (hybrid scoring weights, retrieval methods)
  - Measure real impact: CTR, ATC, Conversion, Revenue
  - Data-driven optimization without over-engineering
  - Perfect for small scale: easy to implement, high value

#### **Implementation Overview**

**1. Strategy Assignment (Feature Flags)**
- ✅ User routing to different strategies (A, B, C) based on consistent hashing
- ✅ Consistent assignment: Same user always gets same strategy (based on userId/sessionId hash)
- ✅ Strategy variants defined in `frontend/src/utils/abTesting.ts`

**2. Event Tracking with Strategy Context**
- ✅ Event schema extended with `source`, `strategy`, `position` fields in `context`
- ✅ `impression` events: Track when recommendations are shown với strategy
- ✅ `view` events: Track clicks on recommended products với strategy
- ✅ `add_to_cart` events: Track add to cart với strategy (truy vết từ view/impression)
- ✅ `purchase` events: Track purchases với strategy (truy vết từ cart items)

**3. Strategy Tracking System**
- ✅ **Strategy Tracker Utility** (`frontend/src/utils/strategyTracker.ts`):
  - Lưu mapping `itemId → strategy` vào sessionStorage khi emit impression/view
  - Lookup strategy khi emit add_to_cart/purchase events
  - Auto-cleanup expired mappings (7 days TTL)
- ✅ **Event Emitter Integration**:
  - Tự động track strategy từ impression/view events
  - Tự động lookup và attach strategy vào add_to_cart/purchase events
  - Fallback: Nếu không tìm thấy strategy, events không được tính vào A/B test metrics

**4. Backend Metrics API**
- ✅ `/api/events/ab-test-metrics` endpoint:
  - Tính metrics theo strategy: Impressions, Clicks, Add to Carts, Purchases, Revenue
  - Tính rates: CTR, ATC Rate, Conversion Rate, Revenue per Impression
  - Filter by date range và strategy
  - Group by strategy với unique users, sessions, items

**5. Admin Dashboard**
- ✅ A/B Test Dashboard component (`frontend/src/components/admin/ABTestDashboard.tsx`):
  - Hiển thị metrics theo strategy trong bảng
  - Summary cards: Total strategies, impressions, clicks, add to carts, purchases, revenue
  - Filters: Date range, strategy
  - Real-time metrics: CTR, ATC Rate, Conversion Rate, Revenue per Impression

**6. Frontend Integration**
- ✅ Home page: Emit impression events khi load recommendations với strategy
- ✅ ProductCard: Track source và strategy khi user click vào recommendations
- ✅ ProductDetail: Lookup và attach strategy vào add_to_cart events
- ✅ CartPage: Lookup và attach strategy vào purchase events từ cart items

#### **Workflow**

```
1. User vào Home Page
   → Load recommendations với strategy (A, B, hoặc C)
   → Emit impression event với strategy
   → Lưu mapping: itemIds → strategy vào sessionStorage

2. User click vào ProductCard từ recommendations
   → Emit view event với strategy
   → Lưu mapping: itemId → strategy vào sessionStorage

3. User vào ProductDetail page
   → Product được track với strategy (nếu đến từ recommendation)

4. User click "Add to Cart"
   → Lookup strategy từ sessionStorage bằng itemId
   → Emit add_to_cart event VỚI strategy (nếu tìm thấy)

5. User checkout
   → Lookup strategy từ sessionStorage cho tất cả items trong cart
   → Emit purchase event VỚI strategy (nếu tìm thấy)

6. Backend tính metrics
   → Aggregate events có context.source = 'recommendation' và context.strategy
   → Calculate CTR, ATC Rate, Conversion Rate, Revenue per strategy
   → Return metrics cho Admin Dashboard
```

#### **Strategy Variants**
- **Strategy A** (Content-Focused): α=0.6, β=0.3, γ=0.1 (20% users)
- **Strategy B** (Trending-Focused): α=0.3, β=0.6, γ=0.1 (30% users)
- **Strategy C** (Personalization-Focused): α=0.3, β=0.2, γ=0.5 (50% users)

#### **Metrics Tracked**
- **Impressions**: Số lần recommendations được hiển thị
- **Clicks**: Số lần user click vào recommended products
- **Add to Carts**: Số lần user add to cart từ recommendations
- **Purchases**: Số lần user purchase từ recommendations
- **Revenue**: Tổng doanh thu từ recommendations
- **CTR** (Click-Through Rate): Clicks / Impressions
- **ATC Rate**: Add to Carts / Impressions
- **Conversion Rate**: Purchases / Impressions
- **Revenue per Impression**: Revenue / Impressions
- **Unique users, sessions, items** per strategy

#### **Key Files**
- `frontend/src/utils/abTesting.ts`: Strategy assignment logic
- `frontend/src/utils/strategyTracker.ts`: Strategy tracking utility
- `frontend/src/utils/eventEmitter.ts`: Event emission với strategy tracking
- `frontend/src/pages/Home.tsx`: Impression events
- `frontend/src/components/ProductCard.tsx`: View events với strategy
- `frontend/src/pages/ProductDetail.tsx`: Add to cart events với strategy
- `frontend/src/pages/CartPage.tsx`: Purchase events với strategy
- `backend/order-service/controllers/eventsController.js`: A/B test metrics calculation
- `backend/order-service/routes/events.js`: A/B test metrics endpoint
- `frontend/src/components/admin/ABTestDashboard.tsx`: Admin dashboard

### ❌ Phase 7: Privacy, Compliance, Governance — FUTURE
- Not yet implemented
- Can be added later when scaling or if compliance requirements arise

### 📊 Progress Summary
- **Phase 0-2 (Events)**: 100% ✅
- **Phase 3 (Retrieval)**: 90% ✅ (hybrid scoring implemented, optional optimizations remain)
- **Phase 4 (Ranking)**: ⏭️ **SKIPPED** (not needed for ~100 products)
- **Phase 5 (Orchestrator)**: 🔄 **SIMPLIFIED** (basic rules only, skip complex orchestration)
- **Phase 6 (A/B Testing)**: 100% ✅ (feature flags, event tracking, metrics API, admin dashboard)
- **Phase 7 (Privacy)**: 0% ❌ (future work)

**Overall**: Đã hoàn thành **Phase 3 (Retrieval)** và **Phase 6 (A/B Testing)**! 

**Key Achievements**:
- ✅ Hybrid scoring: Embedding similarity + Popularity + User affinity
- ✅ Redis caching: Improved performance cho popularity/affinity scores
- ✅ A/B Testing: Complete workflow từ strategy assignment → event tracking → metrics calculation
- ✅ Strategy tracking: SessionStorage-based mapping để truy vết strategy qua toàn bộ user journey
- ✅ Admin Dashboard: Real-time A/B test metrics visualization

**Next Steps**: 
- 📊 Collect A/B test data và analyze results
- 🎯 Optimize strategy weights based on metrics (CTR, ATC Rate, Conversion Rate, Revenue)
- 🔍 Monitor metrics over time để identify best performing strategy
- 🔄 Consider Phase 7 (Privacy) nếu cần compliance

### 🎯 Phase 3 API Usage Example

```bash
# Retrieve personalized recommendations with hybrid scoring
POST /api/recommendations/retrieve/personalized
{
  "recentItemIds": ["product-id-1", "product-id-2"],
  "userId": "user-id-123",  # Optional, for personalization
  "limit": 50,
  "alpha": 0.6,  # Optional: embedding similarity weight
  "beta": 0.3,   # Optional: popularity weight
  "gamma": 0.1   # Optional: user affinity weight
}

# Response includes score breakdown
{
  "candidates": [
    {
      "product": {...},
      "score": 0.85,
      "breakdown": {
        "similarity": 0.92,
        "popularity": 45.5,
        "affinity": 12.3
      }
    }
  ],
  "count": 50,
  "method": "hybrid-scoring-personalized",
  "weights": {
    "alpha": 0.6,
    "beta": 0.3,
    "gamma": 0.1
  }
}
```

### 🎯 Phase 6 API Usage Examples

```bash
# Get A/B test metrics
GET /api/events/ab-test-metrics?startDate=2024-01-01&endDate=2024-12-31

# Response
{
  "success": true,
  "data": {
    "strategies": [
      {
        "strategy": "hybrid-alpha0.6-beta0.3-gamma0.1",
        "impressions": 1000,
        "uniqueSessions": 500,
        "uniqueUsers": 400,
        "clicks": 50,
        "addToCarts": 10,
        "purchases": 5,
        "revenue": 5000000,
        "uniqueItemsClicked": 45,
        "uniqueItemsAdded": 8,
        "uniqueItemsPurchased": 0, // Purchase events không có itemId
        "ctr": 0.05,
        "atcRate": 0.01,
        "conversionRate": 0.005,
        "revenuePerImpression": 5000
      }
    ],
    "summary": {
      "totalStrategies": 3,
      "totalImpressions": 3000,
      "totalClicks": 150,
      "totalAddToCarts": 30,
      "totalPurchases": 15,
      "totalRevenue": 15000000
    }
  }
}
```

### 🎯 Phase 6 Frontend Integration

```typescript
// A/B Testing utility
import { getStrategyConfig, getStrategyIdentifier, isABTestingEnabled } from '../utils/abTesting'
import { emitEvent } from '../utils/eventEmitter'

// Home Page: Load recommendations với strategy
const strategyConfig = getStrategyConfig(userId, sessionId)
const strategyId = getStrategyIdentifier(strategyConfig)

// Get recommendations với strategy weights
const response = await fashionApi.getPersonalizedRecommendations(
  userId, 
  8,
  isABTestingEnabled() ? strategyConfig : undefined
)

// Emit impression event (strategy được tự động track)
emitEvent({
  type: 'impression',
  itemIds: response.data.map(p => p._id),
  context: {
    source: 'recommendation',
    strategy: response.strategy || strategyId,
    position: 'home-recommendations'
  }
})

// ProductCard: Track clicks với strategy
<ProductCard
  source="recommendation"
  strategy={strategyId}
  position="home-recommendations"
/>

// ProductDetail: Add to cart tự động lookup strategy
// (strategy được tự động lookup từ sessionStorage)

// CartPage: Purchase tự động lookup strategy từ cart items
// (strategy được tự động lookup từ sessionStorage)
```

### 🎯 Phase 6 Strategy Tracking Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IMPRESSION EVENT                                         │
│    - User sees recommendations với strategy                 │
│    - Emit impression event với strategy                     │
│    - Save mapping: itemIds → strategy (sessionStorage)      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VIEW EVENT (Click)                                       │
│    - User clicks recommended product                        │
│    - Emit view event với strategy                           │
│    - Save mapping: itemId → strategy (sessionStorage)       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ADD TO CART EVENT                                        │
│    - User adds product to cart                              │
│    - Lookup strategy từ sessionStorage bằng itemId          │
│    - Emit add_to_cart event VỚI strategy (nếu tìm thấy)    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. PURCHASE EVENT                                           │
│    - User checks out                                        │
│    - Lookup strategy từ sessionStorage cho cart items       │
│    - Emit purchase event VỚI strategy (nếu tìm thấy)       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BACKEND METRICS                                          │
│    - Aggregate events có context.source = 'recommendation'  │
│    - Calculate CTR, ATC Rate, Conversion Rate per strategy  │
│    - Return metrics cho Admin Dashboard                     │
└─────────────────────────────────────────────────────────────┘
```

---
Owner: AI Pair (assistant)
Last updated: 2025-11-08 (Phase 6 completed với strategy tracking fix)
