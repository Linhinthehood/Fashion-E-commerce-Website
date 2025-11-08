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
4. Optional: add retries/backoff and dead-letter handling
5. Implement Retrieval (Stage 1) service
6. Implement Ranking (Stage 2) service
7. Orchestrate end-to-end `/recommendations` with business rules/diversity
8. Add A/B testing flags and monitoring dashboards

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

## 14) Phase 6 — A/B Testing & Monitoring
- Feature flags (e.g., Unleash) to route % traffic giữa model A/B.
- Online metrics: CTR, ATC, Conversion, Revenue; by segment (device, source).
- Dashboards: extend Admin Dashboard với chart events CTR chain và revenue uplift.
- Drift detection: monitor distribution of features/scores; retrain triggers.

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

## 17) Implementation Checklist (Next)
- [x] Retrieval: personalized retrieve endpoint using embeddings (✅ `/api/recommendations/retrieve/personalized` exists)
- [ ] Retrieval: integrate popularity scores from events into hybrid scoring (α·embeddingSim + β·popularity + γ·categoryAffinity)
- [x] Aggregation endpoints: popularity (view/add_to_cart/purchase weighted) ✅
- [x] Aggregation endpoints: user affinity by itemId ✅
- [ ] Aggregation endpoints: user affinity by category/brand (currently only by itemId)
- [ ] Aggregation jobs: daily/hourly scheduled jobs to pre-compute popularity/affinity (currently on-demand)
- [ ] Online store (Redis) for popularity/affinity; fallback to DB
- [ ] Ranking API skeleton with pluggable scorer (start rule‑based, later ML) - `/api/recommendations/rank`
- [ ] Orchestrated `/api/recommendations` in gateway with diversification (currently only proxy)
- [ ] A/B flags to toggle models/pipelines
- [ ] Admin dashboard: add CTR/ATC/Conversion widgets (currently only event counts)
- [ ] Privacy: add opt‑out flag and client respect flow

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

- Phase 6: A/B Testing & Monitoring (Thử nghiệm công bằng)
  - Mục tiêu: So sánh hai cách gợi ý xem cách nào tốt hơn (nhiều người bấm/mua hơn).
  - Kết quả: Chọn được cách “giỏi” hơn, nhìn số liệu rõ ràng (CTR, ATC, mua hàng).

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

### ⚠️ Phase 3: Retrieval (Stage 1) — ĐANG THỰC HIỆN (PARTIAL)
- **Endpoint**: ✅ `/api/recommendations/retrieve/personalized` exists
- **Current Implementation**:
  - ✅ Uses FAISS embeddings for similarity search
  - ✅ Aggregates candidates from multiple seed items
  - ❌ **NOT YET**: Integrate popularity scores from events
  - ❌ **NOT YET**: Integrate user affinity by category/brand (only itemId-level)
  - ❌ **NOT YET**: Hybrid scoring (α·embeddingSim + β·popularity + γ·categoryAffinity)

- **Missing Components**:
  - Redis cache for popularity/affinity (currently on-demand DB queries)
  - Scheduled aggregation jobs (daily/hourly) to pre-compute metrics
  - Category/brand-level user affinity (currently only itemId-level)

### ❌ Phase 4: Ranking (Stage 2) — CHƯA BẮT ĐẦU
- **Status**: Not implemented
- **Current**: Only simple similarity-based ranking in `rank_and_limit()` function
- **Missing**:
  - `/api/recommendations/rank` endpoint
  - ML model (XGBoost/LightGBM)
  - Feature engineering pipeline
  - Training pipeline from events data

### ❌ Phase 5: Orchestrator + Business Rules — CHƯA BẮT ĐẦU
- **Status**: API Gateway only proxies `/api/recommendations` → fashion-service
- **Missing**:
  - Orchestrated endpoint that combines retrieve + rank + diversify
  - Diversification logic (MMR/xQuAD)
  - Business rules (stock filtering, blacklist, brand/category caps)
  - Redis caching for recommendations

### ❌ Phase 6-7: A/B Testing & Privacy — CHƯA BẮT ĐẦU
- Not yet implemented

### 📊 Progress Summary
- **Phase 0-2 (Events)**: 100% ✅
- **Phase 3 (Retrieval)**: ~40% ⚠️ (endpoint exists, but missing hybrid scoring)
- **Phase 4 (Ranking)**: 0% ❌
- **Phase 5 (Orchestrator)**: 0% ❌
- **Phase 6-7 (A/B & Privacy)**: 0% ❌

**Overall**: Đang ở giai đoạn **Phase 3 (Retrieval)** — đã có endpoint cơ bản nhưng chưa tích hợp đầy đủ popularity và affinity từ events pipeline.

---
Owner: AI Pair (assistant)
Last updated: 2025-11-03
