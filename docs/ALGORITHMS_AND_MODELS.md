# THUẬT TOÁN VÀ MÔ HÌNH - HỆ THỐNG RECOMMENDATION

## 📋 MỤC LỤC
1. [Tổng quan](#1-tổng-quan)
2. [Mô hình Deep Learning](#2-mô-hình-deep-learning)
3. [Thuật toán Retrieval](#3-thuật-toán-retrieval)
4. [Thuật toán Scoring & Ranking](#4-thuật-toán-scoring--ranking)
5. [Business Rules & Filtering](#5-business-rules--filtering)
6. [Mô hình và Thuật toán sẽ Triển khai](#6-mô-hình-và-thuật-toán-sẽ-triển-khai)
7. [So sánh và Đánh giá](#7-so-sánh-và-đánh-giá)
8. [Tài liệu tham khảo](#8-tài-liệu-tham-khảo)

---

## 1. TỔNG QUAN

### 1.1. Kiến trúc tổng thể
Hệ thống recommendation sử dụng kiến trúc **Two-Stage Retrieval & Ranking**:

```
Stage 1: Retrieval (Candidate Generation)
  ↓
  [FAISS Vector Search] + [Popularity] + [User Affinity]
  ↓
  ~50-200 candidates

Stage 2: Ranking (Candidate Scoring)
  ↓
  [Business Rules] + [Soft Scoring] + [Diversification]
  ↓
  Top-N recommendations
```

### 1.2. Phân loại thuật toán

| Loại | Thuật toán | Trạng thái | Mô tả |
|------|-----------|------------|-------|
| **Deep Learning** | FashionCLIP | ✅ Đã triển khai | Vision-language model để encode hình ảnh |
| **Vector Search** | FAISS (IndexFlatIP) | ✅ Đã triển khai | Approximate Nearest Neighbors |
| **Similarity** | Cosine Similarity | ✅ Đã triển khai | Tính độ tương đồng giữa embeddings |
| **Retrieval** | Hybrid Scoring | ✅ Đã triển khai | Kết hợp embedding + popularity + affinity |
| **Ranking** | Business Rules | ✅ Đã triển khai | Soft scoring với price/gender/usage/brand |
| **Ranking** | Learning-to-Rank | ❌ Chưa triển khai | XGBoost/LightGBM cho ranking |
| **Diversification** | MMR/xQuAD | ❌ Chưa triển khai | Tránh redundancy trong recommendations |
| **Testing** | A/B Testing | ❌ Chưa triển khai | So sánh hiệu quả các mô hình |

---

## 2. MÔ HÌNH DEEP LEARNING

### 2.1. FashionCLIP Model

#### 2.1.1. Kiến trúc

**Base Model**: CLIP (Contrastive Language-Image Pre-training)
- **Provider**: OpenAI
- **Model**: `openai/clip-vit-base-patch32`
- **Vision Encoder**: Vision Transformer (ViT-Base/32)
  - Input: Images (224x224, RGB)
  - Output: Image embeddings (512 dimensions)
- **Text Encoder**: Transformer-based
  - Input: Text tokens (max 77 tokens)
  - Output: Text embeddings (512 dimensions)

**Customization**:
- **Projection Heads**: Linear layers để giảm chiều từ 512D → 256D
- **Layer Normalization**: Ổn định training và inference
- **L2 Normalization**: Normalize output embeddings (||embedding|| = 1)

#### 2.1.2. Forward Pass

```
Input Image (224x224, RGB)
  ↓
Vision Transformer (ViT-Base/32)
  ↓
Image Embedding (512D)
  ↓
Projection Head (Linear + LayerNorm)
  ↓
Fashion Embedding (256D)
  ↓
L2 Normalization
  ↓
Normalized Embedding (256D, ||embedding|| = 1.0)
```

#### 2.1.3. Công thức

**Image Embedding**:
```
e_img = L2_norm(ProjectionHead(ViT_Encoder(image)))
```

**Text Embedding**:
```
e_txt = L2_norm(ProjectionHead(Text_Encoder(text)))
```

Trong đó:
- `ViT_Encoder`: Vision Transformer encoder
- `Text_Encoder`: Transformer text encoder
- `ProjectionHead`: Linear layer (512D → 256D) + LayerNorm
- `L2_norm`: L2 normalization để ||e|| = 1

#### 2.1.4. Training

**Checkpoint**: `models/fashion_clip_best.pt`

**Quá trình training** (đã thực hiện):
1. **Base model**: Load pretrained CLIP từ OpenAI
2. **Fine-tuning**: Train trên fashion dataset
3. **Projection heads**: Train projection layers để map 512D → 256D
4. **Objective**: Contrastive learning để học representation tốt hơn cho fashion domain

**Hyperparameters** (từ checkpoint config):
- `embedding_dim`: 256
- `max_length`: 77 (text tokens)
- `image_size`: 224
- `model_name`: "openai/clip-vit-base-patch32"

#### 2.1.5. Input/Output

| Component | Input | Output |
|-----------|-------|--------|
| **FashionCLIP.encode_image()** | PIL Image (224x224, RGB) | Vector 256D (float32, L2-normalized) |
| **FashionCLIP.encode_text()** | Text string (tokenized, max 77) | Vector 256D (float32, L2-normalized) |

**Ví dụ**:
```python
# Input
image = Image.open("product.jpg")  # PIL Image, 224x224, RGB

# Output
embedding = model.encode_image(image)
# Shape: (256,)
# Type: float32
# Norm: ||embedding|| = 1.0
```

---

## 3. THUẬT TOÁN RETRIEVAL

### 3.1. FAISS Vector Search

#### 3.1.1. Mô tả
**FAISS** (Facebook AI Similarity Search) là thư viện tối ưu cho tìm kiếm vector similarity với hàng triệu vectors.

**Index Type**: `IndexFlatIP` (Inner Product)
- Phù hợp với **cosine similarity** vì embeddings đã được normalize L2
- Khi ||a|| = ||b|| = 1, thì: `cosine_similarity(a, b) = dot_product(a, b)`

#### 3.1.2. Quy trình

```
1. Pre-compute embeddings (Offline)
   - Encode tất cả sản phẩm → embeddings (256D)
   - Lưu vào FAISS index
   - Lưu metadata (product IDs, URLs) vào NPZ file

2. Query (Online)
   - Encode query product → embedding (256D)
   - Search FAISS index: index.search(query_embedding, k=50)
   - Nhận về: similarities array, indices array

3. Map to Products
   - Dùng indices để map về product IDs
   - Fetch product details từ database
   - Return top-K products
```

#### 3.1.3. Công thức

**Inner Product Search**:
```
similarity[i] = dot_product(query_embedding, index_embedding[i])
```

Vì embeddings đã normalize L2:
```
similarity[i] = cosine_similarity(query_embedding, index_embedding[i])
```

**Range**: [-1, 1] (sau khi normalize, thực tế là [0, 1] vì embeddings là non-negative)

#### 3.1.4. Performance

- **Index size**: ~N vectors (N = số sản phẩm)
- **Query time**: O(log N) với approximate methods, O(N) với IndexFlatIP
- **Memory**: ~256 bytes per vector
- **Latency**: < 10ms cho queries với hàng nghìn vectors

### 3.2. Cosine Similarity

#### 3.2.1. Công thức

**Cosine Similarity**:
```
similarity(A, B) = dot_product(A, B) / (||A|| * ||B||)
```

Vì embeddings đã normalize L2 (||A|| = ||B|| = 1):
```
similarity(A, B) = dot_product(A, B)
```

#### 3.2.2. Ý nghĩa

- **1.0**: Hoàn toàn giống nhau (cùng hướng)
- **0.0**: Trực giao (không liên quan)
- **-1.0**: Hoàn toàn ngược nhau (không xảy ra với embeddings đã normalize)

#### 3.2.3. Implementation

```python
# Vì embeddings đã normalize L2
similarity = np.dot(embedding_A, embedding_B)
# Range: [0, 1] (thực tế với fashion embeddings)
```

### 3.3. Aggregation-based Personalized Retrieval

#### 3.3.1. Mô tả
Thuật toán gộp kết quả từ nhiều seed items (sản phẩm người dùng đã xem/thêm giỏ/mua) để tạo personalized recommendations.

#### 3.3.2. Quy trình

```
INPUT: recent_item_ids = [id1, id2, ..., id10]  (tối đa 10 items)

1. Với mỗi seed_id trong recent_item_ids:
   a. Tìm top-K similar products (K=50) bằng FAISS
   b. Lấy similarity scores
   c. Lưu vào embedding_scores[product_id] = max(similarity)

2. AGGREGATION:
   - Với mỗi product xuất hiện trong nhiều seed results:
     - Lấy MAX similarity score
     - aggregate_scores[product_id] = max(all_similarities)

3. RANKING:
   - Sắp xếp aggregate_scores theo thứ tự giảm dần
   - Lấy top-N (limit) products

OUTPUT: Danh sách candidates với aggregated scores
```

#### 3.3.3. Công thức

**MAX Aggregation**:
```
aggregate_score[product_id] = max(similarity(seed_i, product_id)) 
                                for all seed_i in recent_item_ids
```

**Ví dụ**:
```
Seed 1 → [Product A: 0.85, Product B: 0.80]
Seed 2 → [Product A: 0.90, Product C: 0.75]
Seed 3 → [Product B: 0.88, Product C: 0.70]

Aggregate:
- Product A: max(0.85, 0.90) = 0.90
- Product B: max(0.80, 0.88) = 0.88
- Product C: max(0.75, 0.70) = 0.75

Ranking (top-2):
1. Product A: 0.90
2. Product B: 0.88
```

#### 3.3.4. Ưu điểm
- ✅ Đơn giản, dễ hiểu
- ✅ Hiệu quả với ít seed items
- ✅ Tận dụng visual similarity

#### 3.3.5. Hạn chế
- ⚠️ Chỉ dùng MAX, không weighted average
- ⚠️ Không xem xét thứ tự/tần suất tương tác
- ⚠️ Cold start: Người dùng mới chưa có seed items

### 3.4. Hybrid Scoring (Retrieval Stage)

#### 3.4.1. Mô tả
Kết hợp **embedding similarity**, **popularity**, và **user affinity** để tạo hybrid score cho personalized retrieval.

#### 3.4.2. Công thức

**Hybrid Score**:
```
hybrid_score = α·normalized_embedding + β·normalized_popularity + γ·normalized_affinity
```

Trong đó:
- `α` (alpha): Weight cho embedding similarity (default: 0.6)
- `β` (beta): Weight cho popularity (default: 0.3)
- `γ` (gamma): Weight cho user affinity (default: 0.1)
- Tổng weights được normalize về 1.0: `α + β + γ = 1.0`

#### 3.4.3. Normalization

**Min-Max Normalization**:
```
normalized_score = (score - min_score) / (max_score - min_score)
```

Áp dụng cho từng component:
- `normalized_embedding`: Normalize embedding similarity scores về [0, 1]
- `normalized_popularity`: Normalize popularity scores về [0, 1]
- `normalized_affinity`: Normalize user affinity scores về [0, 1]

#### 3.4.4. Data Sources

**1. Embedding Similarity**:
- Source: FAISS search từ seed items
- Range: [0, 1] (cosine similarity)

**2. Popularity**:
- Source: Events aggregation (`/api/events/aggregates/popularity`)
- Calculation: Weighted sum của events (view, add_to_cart, purchase)
- Weights: view=1, add_to_cart=2, purchase=5
- Formula: `popularity = view_count + 2×add_to_cart_count + 5×purchase_count`

**3. User Affinity**:
- Source: Events aggregation (`/api/events/aggregates/affinity?userId=...`)
- Calculation: Weighted sum của user's events với từng item
- Weights: view=1, add_to_cart=2, purchase=5
- Formula: `affinity[item] = sum(weight × event_count) for user's events with item`

#### 3.4.5. Quy trình

```
1. Fetch Embedding Similarity
   - Với mỗi seed item, tìm top-50 similar products (FAISS)
   - Aggregate bằng MAX: embedding_scores[product_id] = max(similarity)

2. Fetch Popularity Scores
   - Call API: GET /api/events/aggregates/popularity
   - Nhận về: {itemId: popularity_score}
   - popularity_scores[item_id] = score

3. Fetch User Affinity (nếu có userId)
   - Call API: GET /api/events/aggregates/affinity?userId=...
   - Nhận về: {itemId: affinity_score}
   - user_affinity_scores[item_id] = score

4. Normalize Scores
   - normalized_embedding = min_max_normalize(embedding_scores)
   - normalized_popularity = min_max_normalize(popularity_scores)
   - normalized_affinity = min_max_normalize(user_affinity_scores)

5. Compute Hybrid Scores
   - Với mỗi product_id:
     hybrid_score = α·normalized_embedding + β·normalized_popularity + γ·normalized_affinity

6. Rank và Return
   - Sắp xếp theo hybrid_score giảm dần
   - Return top-N candidates
```

#### 3.4.6. Fallback Strategy

**Nếu không có recent items**:
1. Fallback to popularity-only ranking
2. Nếu không có popularity, fallback to index order

**Nếu không có userId**:
- Bỏ qua user affinity (γ = 0)
- Chỉ dùng embedding + popularity

**Nếu API calls fail**:
- Graceful degradation: Bỏ qua component failed
- Adjust weights để tổng vẫn = 1.0

#### 3.4.7. Ví dụ

```python
# Input
recent_item_ids = ["product-1", "product-2"]
userId = "user-123"
alpha = 0.6, beta = 0.3, gamma = 0.1

# Scores (before normalization)
embedding_scores = {"product-A": 0.85, "product-B": 0.70}
popularity_scores = {"product-A": 45.5, "product-B": 120.0}
affinity_scores = {"product-A": 12.3, "product-B": 5.0}

# Normalized scores
normalized_embedding = {"product-A": 1.0, "product-B": 0.0}  # min=0.70, max=0.85
normalized_popularity = {"product-A": 0.0, "product-B": 1.0}  # min=45.5, max=120.0
normalized_affinity = {"product-A": 1.0, "product-B": 0.0}    # min=5.0, max=12.3

# Hybrid scores
hybrid_A = 0.6×1.0 + 0.3×0.0 + 0.1×1.0 = 0.7
hybrid_B = 0.6×0.0 + 0.3×1.0 + 0.1×0.0 = 0.3

# Ranking
1. Product A: 0.7
2. Product B: 0.3
```

---

## 4. THUẬT TOÁN SCORING & RANKING

### 4.1. Business Rules Engine (Soft Scoring)

#### 4.1.1. Mô tả
Thay vì loại bỏ sản phẩm (hard filter), hệ thống điều chỉnh điểm similarity dựa trên các quy tắc kinh doanh (soft scoring).

#### 4.1.2. Hard Filter: Category Matching

**Quy tắc**: Chỉ giữ lại sản phẩm cùng category với target product.

**Fields kiểm tra**:
- `articleType`
- `masterCategory`
- `subCategory`

**Logic**: Tất cả 3 fields phải khớp (nếu có giá trị).

**Ví dụ**:
```
Target: {articleType: "T-Shirt", masterCategory: "Apparel", subCategory: "Topwear"}
Candidate: {articleType: "T-Shirt", masterCategory: "Apparel", subCategory: "Topwear"} ✅ PASS
Candidate: {articleType: "Jeans", masterCategory: "Apparel", subCategory: "Bottomwear"} ❌ FILTERED OUT
```

#### 4.1.3. Soft Scoring: Price

**Quy tắc**:
- **Trong khoảng giá** (±tolerance): **+10% boost**
- **Ngoài khoảng giá**: **-5% penalty**

**Công thức**:
```
tolerance = price_tolerance (default: 0.5 = ±50%)
min_price = target_price × (1 - tolerance)
max_price = target_price × (1 + tolerance)

if min_price ≤ product_price ≤ max_price:
    adjusted_score = min(base_score + 0.10, 1.0)
else:
    adjusted_score = max(base_score - 0.05, 0.0)
```

**Ví dụ**:
```
target_price = 500,000 VND
tolerance = 0.5
min_price = 250,000 VND
max_price = 750,000 VND

Product A: price = 600,000 VND → Trong khoảng → +10% boost
Product B: price = 1,000,000 VND → Ngoài khoảng → -5% penalty
```

#### 4.1.4. Soft Scoring: Gender

**Quy tắc**:
- **Exact match** (Male-Male, Female-Female): **+8% boost**
- **Unisex** (một trong hai là Unisex): **+5% boost**
- **Mismatch** (Male-Female): **-10% penalty**

**Công thức**:
```
if product_gender == target_gender:
    adjusted_score = min(base_score + 0.08, 1.0)
elif product_gender == "Unisex" or target_gender == "Unisex":
    adjusted_score = min(base_score + 0.05, 1.0)
else:
    adjusted_score = max(base_score - 0.10, 0.0)
```

#### 4.1.5. Soft Scoring: Usage

**Quy tắc**:
- **Exact match** (Casual-Casual, Formal-Formal): **+8% boost**
- **Casual fallback** (một trong hai là Casual): **+3% boost**
- **Mismatch**: **-8% penalty**

**Công thức**:
```
if product_usage == target_usage:
    adjusted_score = min(base_score + 0.08, 1.0)
elif product_usage == "Casual" or target_usage == "Casual":
    adjusted_score = min(base_score + 0.03, 1.0)
else:
    adjusted_score = max(base_score - 0.08, 0.0)
```

#### 4.1.6. Soft Scoring: Brand

**Quy tắc**:
- **Cùng brand**: **+5% boost** (có thể cấu hình)

**Công thức**:
```
brand_boost = options.get('brandBoost', 0.05)

if product_brand.lower() == target_brand.lower():
    adjusted_score = min(base_score + brand_boost, 1.0)
```

#### 4.1.7. Tổng hợp Soft Scoring

**Quy trình**:
```
1. Base score = similarity_score (từ FAISS hoặc hybrid scoring)

2. Apply Price Scoring
   adjusted_score = base_score ± price_adjustment

3. Apply Gender Scoring
   adjusted_score = adjusted_score ± gender_adjustment

4. Apply Usage Scoring
   adjusted_score = adjusted_score ± usage_adjustment

5. Apply Brand Boost
   adjusted_score = adjusted_score + brand_boost (nếu cùng brand)

6. Cap at [0, 1]
   adjusted_score = min(max(adjusted_score, 0.0), 1.0)

7. Filter by min_similarity threshold
   if adjusted_score < min_similarity:
       remove product
```

**Ví dụ tính điểm**:
```
Base similarity: 0.80

Price: Trong khoảng → +0.10 → 0.90
Gender: Exact match → +0.08 → 0.98
Usage: Exact match → +0.08 → 1.0 (cap)
Brand: Cùng brand → +0.05 → 1.0 (cap)

Final score: 1.0
```

### 4.2. Rank and Limit

#### 4.2.1. Mô tả
Sắp xếp sản phẩm theo adjusted score và giới hạn số lượng kết quả.

#### 4.2.2. Quy trình

```
1. Sort by adjusted_score (descending)
   sorted_products = sort(products, key=lambda p: -p.adjusted_score)

2. Limit to top-N
   top_products = sorted_products[:limit]

3. Return results
```

#### 4.2.3. Diversity Boost (Optional, chưa triển khai)

**Mục tiêu**: Tránh hiển thị quá nhiều sản phẩm giống nhau (cùng brand, cùng color).

**Thuật toán** (sẽ triển khai):
- MMR (Maximal Marginal Relevance)
- xQuAD (eXtended Query Aspect Diversification)

---

## 5. BUSINESS RULES & FILTERING

### 5.1. Category Pre-filtering

#### 5.1.1. Mô tả
Lọc sản phẩm theo category TRƯỚC KHI thực hiện AI search để giảm số lượng candidates.

#### 5.1.2. Quy trình

```
1. Extract target category
   target_category = {
       articleType: target.articleType,
       masterCategory: target.masterCategory,
       subCategory: target.subCategory
   }

2. Pre-filter candidates
   candidate_pool = all_products.filter(
       product.articleType == target.articleType AND
       product.masterCategory == target.masterCategory AND
       product.subCategory == target.subCategory
   )

3. Apply AI search on filtered pool
   results = FAISS_search(candidate_pool, query_embedding)
```

#### 5.1.3. Ưu điểm
- ✅ Giảm số lượng candidates cần xử lý
- ✅ Tăng tốc độ search
- ✅ Đảm bảo recommendations cùng category

#### 5.1.4. Hạn chế
- ⚠️ Có thể bỏ sót cross-category recommendations
- ⚠️ Không linh hoạt cho users muốn explore

### 5.2. Stock Filtering

#### 5.2.1. Mô tả
Chỉ recommend sản phẩm còn hàng (có ít nhất một variant active với stock > 0).

#### 5.2.2. Quy trình

```
1. Check product variants
   has_stock = any(variant.status == "Active" AND variant.stock > 0 
                   for variant in product.variants)

2. Filter out out-of-stock products
   if not has_stock:
       remove product from recommendations
```

### 5.3. Price Range Filtering (Optional)

#### 5.3.1. Mô tả
Có thể filter theo khoảng giá (chưa triển khai như hard filter, chỉ có soft scoring).

#### 5.3.2. Sẽ triển khai
- Hard filter: Loại bỏ sản phẩm ngoài khoảng giá
- User preference: Lưu price range preference của user

---

## 6. MÔ HÌNH VÀ THUẬT TOÁN SẼ TRIỂN KHAI

### 6.1. Learning-to-Rank (Phase 4)

#### 6.1.1. Mô tả
Sử dụng machine learning model (XGBoost/LightGBM) để sắp xếp candidates tối ưu CTR/ATC/Conversion.

#### 6.1.2. Kiến trúc

**Model**: XGBoost hoặc LightGBM
- **Type**: Gradient Boosting Decision Trees
- **Task**: Ranking (pointwise, pairwise, hoặc listwise)

#### 6.1.3. Features

**1. User Features**:
- `category_affinity`: Affinity với category (từ events)
- `brand_affinity`: Affinity với brand (từ events)
- `price_sensitivity`: Average spend (từ orders)
- `recency`: Thời gian kể từ lần tương tác cuối
- `frequency`: Tần suất tương tác

**2. Item Features**:
- `price`: Giá sản phẩm
- `category`: Category information (one-hot encoded)
- `brand`: Brand (one-hot encoded)
- `popularity`: Popularity score (từ events)
- `stock`: Số lượng tồn kho
- `age`: Thời gian kể từ khi tạo sản phẩm

**3. Context Features**:
- `time_of_day`: Giờ trong ngày (0-23)
- `day_of_week`: Ngày trong tuần (0-6)
- `device`: Thiết bị (web, mobile)
- `geo`: Địa lý (VN, US, ...)

**4. Cross Features**:
- `similarity_score`: Embedding similarity (từ retrieval)
- `same_category`: Boolean (cùng category với seed item)
- `same_brand`: Boolean (cùng brand với seed item)
- `price_diff`: Chênh lệch giá với seed item

#### 6.1.4. Training Pipeline

**1. Labeled Dataset**:
- **Positive labels**: Clicks, add_to_cart, purchase
- **Negative labels**: Impressions without interactions
- **Source**: Events data (`events` collection)

**2. Feature Engineering**:
- Aggregate events để tính user/item features
- Join với product data để lấy item features
- Extract context từ event context field

**3. Training**:
- Split: Train (80%), Validation (10%), Test (10%)
- Metrics: AUC, NDCG@K, MRR
- Hyperparameter tuning: Grid search hoặc Bayesian optimization

**4. Serving**:
- Load model via ONNX/TorchScript
- Latency target: < 50ms per request
- Batch prediction cho multiple candidates

#### 6.1.5. Công thức

**Pointwise Ranking**:
```
score = ML_Model(user_features, item_features, context_features, cross_features)
```

**Pairwise Ranking** (nếu dùng):
```
P(item_A > item_B) = sigmoid(ML_Model(features_A) - ML_Model(features_B))
```

**Listwise Ranking** (nếu dùng):
```
scores = ML_Model(user_features, [item_features_1, item_features_2, ...])
```

#### 6.1.6. API Endpoint

```
POST /api/recommendations/rank
Body: {
  "userId": "user-123",
  "candidates": [
    {
      "productId": "product-1",
      "features": {...}
    },
    ...
  ],
  "context": {
    "device": "web",
    "timeOfDay": 14,
    "geo": "VN"
  }
}

Response: {
  "ranked": [
    {
      "productId": "product-1",
      "score": 0.85,
      "rank": 1
    },
    ...
  ]
}
```

### 6.2. Diversification (Phase 5)

#### 6.2.1. MMR (Maximal Marginal Relevance)

**Mục tiêu**: Chọn items vừa relevant vừa diverse.

**Công thức**:
```
MMR(item) = λ·relevance(item) - (1-λ)·max_similarity(item, selected_items)
```

Trong đó:
- `λ`: Balance parameter (0 = chỉ diversity, 1 = chỉ relevance)
- `relevance(item)`: Relevance score (từ ranking model)
- `max_similarity(item, selected_items)`: Độ tương đồng cao nhất với items đã chọn

**Quy trình**:
```
1. Initialize: selected = [], candidates = [all_items]

2. Select first item:
   selected.append(candidates.pop(max_relevance_item))

3. For remaining slots:
   For each candidate in candidates:
       mmr_score = λ·relevance(candidate) - (1-λ)·max_similarity(candidate, selected)
   selected.append(candidates.pop(max_mmr_item))

4. Return selected
```

#### 6.2.2. xQuAD (eXtended Query Aspect Diversification)

**Mục tiêu**: Đa dạng hóa theo các aspects của query (category, brand, price range).

**Công thức**:
```
xQuAD(item) = (1-λ)·relevance(item) + λ·coverage(item, selected)
```

Trong đó:
- `coverage(item, selected)`: Độ bao phủ aspects chưa được cover bởi selected items
- `λ`: Balance parameter

**Aspects**:
- Category (articleType, masterCategory, subCategory)
- Brand
- Price range (low, medium, high)
- Color
- Style

### 6.3. Collaborative Filtering (Future)

#### 6.3.1. Matrix Factorization

**Mục tiêu**: Học latent factors từ user-item interaction matrix.

**Công thức**:
```
R_ui ≈ P_u · Q_i^T
```

Trong đó:
- `R_ui`: User-item interaction matrix
- `P_u`: User latent factors (K dimensions)
- `Q_i`: Item latent factors (K dimensions)

**Training**:
- Objective: Minimize reconstruction error
- Regularization: L2 regularization on factors
- Optimization: SGD hoặc ALS

#### 6.3.2. Neural Collaborative Filtering

**Mục tiêu**: Sử dụng neural networks để học user-item interactions.

**Kiến trúc**:
```
User Embedding (K dim) + Item Embedding (K dim)
  ↓
Concatenate
  ↓
MLP (Multi-Layer Perceptron)
  ↓
Output: Interaction Score
```

### 6.4. A/B Testing Framework (Phase 6)

#### 6.4.1. Mô tả
So sánh hiệu quả của các mô hình/thuật toán recommendation.

#### 6.4.2. Metrics

**Online Metrics**:
- **CTR** (Click-Through Rate): `clicks / impressions`
- **ATC** (Add-to-Cart Rate): `add_to_cart / impressions`
- **Conversion Rate**: `purchases / impressions`
- **Revenue**: Total revenue from recommendations

**Offline Metrics**:
- **AUC**: Area Under ROC Curve
- **NDCG@K**: Normalized Discounted Cumulative Gain at K
- **MRR**: Mean Reciprocal Rank

#### 6.4.3. Framework

**Feature Flags**:
- Sử dụng feature flag service (Unleash, LaunchDarkly)
- Route % traffic giữa model A và model B
- Example: 50% traffic → Model A, 50% → Model B

**Tracking**:
- Log model version cho mỗi recommendation request
- Track metrics per model version
- Statistical significance testing (t-test, chi-square test)

### 6.5. Cold Start Solutions

#### 6.5.1. New User Cold Start

**Strategies**:
1. **Popular Items**: Recommend top popular items
2. **Demographic-based**: Recommend based on user demographics (age, gender, location)
3. **Content-based**: Recommend based on user's initial preferences (nếu có)
4. **Hybrid**: Kết hợp multiple strategies

#### 6.5.2. New Item Cold Start

**Strategies**:
1. **Content-based**: Dùng visual similarity (FashionCLIP)
2. **Category-based**: Recommend trong cùng category
3. **Popular boost**: Tăng popularity score cho new items
4. **Exploration**: Ưu tiên new items trong recommendations

---

## 7. SO SÁNH VÀ ĐÁNH GIÁ

### 7.1. So sánh các thuật toán Retrieval

| Thuật toán | Ưu điểm | Nhược điểm | Trạng thái |
|------------|---------|------------|------------|
| **FAISS Vector Search** | ✅ Nhanh, chính xác, scalable | ⚠️ Cần pre-compute embeddings | ✅ Đã triển khai |
| **Hybrid Scoring** | ✅ Kết hợp multiple signals | ⚠️ Phức tạp, cần tune weights | ✅ Đã triển khai |
| **Collaborative Filtering** | ✅ Tận dụng user behavior | ⚠️ Cold start, sparse data | ❌ Chưa triển khai |

### 7.2. So sánh các thuật toán Ranking

| Thuật toán | Ưu điểm | Nhược điểm | Trạng thái |
|------------|---------|------------|------------|
| **Business Rules** | ✅ Đơn giản, interpretable | ⚠️ Rule-based, không học từ data | ✅ Đã triển khai |
| **Learning-to-Rank** | ✅ Học từ data, tối ưu metrics | ⚠️ Cần labeled data, phức tạp | ❌ Chưa triển khai |
| **Neural Ranking** | ✅ Non-linear patterns | ⚠️ Black box, cần nhiều data | ❌ Chưa triển khai |

### 7.3. Đánh giá hiệu quả

#### 7.3.1. Metrics hiện tại

**Offline Metrics** (có thể tính từ events):
- **Coverage**: % sản phẩm được recommend
- **Diversity**: Độ đa dạng của recommendations (brand, category)
- **Popularity Bias**: Độ lệch về popular items

**Online Metrics** (cần tracking):
- **CTR**: Click-through rate
- **ATC**: Add-to-cart rate
- **Conversion**: Purchase rate
- **Revenue**: Revenue từ recommendations

#### 7.3.2. A/B Testing Plan

**Experiment 1**: Business Rules vs Learning-to-Rank
- Hypothesis: Learning-to-Rank sẽ cải thiện CTR và Conversion
- Metrics: CTR, ATC, Conversion Rate
- Duration: 2 weeks
- Traffic split: 50/50

**Experiment 2**: Hybrid Scoring weights
- Hypothesis: Tối ưu weights (α, β, γ) sẽ cải thiện relevance
- Metrics: CTR, User engagement
- Duration: 1 week
- Variations: (0.7, 0.2, 0.1), (0.6, 0.3, 0.1), (0.5, 0.4, 0.1)

### 7.4. Roadmap

#### Phase 3 (Retrieval) - ✅ HOÀN THÀNH
- [x] FAISS vector search
- [x] Hybrid scoring (embedding + popularity + affinity)
- [x] Events integration
- [ ] Redis caching (optional optimization)

#### Phase 4 (Ranking) - ❌ CHƯA BẮT ĐẦU
- [ ] Feature engineering pipeline
- [ ] Learning-to-Rank model (XGBoost/LightGBM)
- [ ] Training pipeline từ events data
- [ ] Model serving (ONNX/TorchScript)
- [ ] A/B testing framework

#### Phase 5 (Orchestration) - ❌ CHƯA BẮT ĐẦU
- [ ] Diversification (MMR/xQuAD)
- [ ] Business rules integration
- [ ] Caching strategy (Redis)
- [ ] Orchestrated endpoint (`/api/recommendations`)

#### Phase 6-7 (A/B Testing & Privacy) - ❌ CHƯA BẮT ĐẦU
- [ ] Feature flags integration
- [ ] Metrics dashboard
- [ ] Privacy compliance (GDPR, opt-out)
- [ ] Data retention policies

---

## 8. TÀI LIỆU THAM KHẢO

### 8.1. Papers

1. **CLIP**: "Learning Transferable Visual Models From Natural Language Supervision" (Radford et al., 2021)
2. **FAISS**: "Billion-scale similarity search with GPUs" (Johnson et al., 2019)
3. **Learning-to-Rank**: "From RankNet to LambdaRank to LambdaMART: An Overview" (Burges, 2010)
4. **MMR**: "The Use of MMR, Diversity-Based Reranking for Reordering Documents and Producing Summaries" (Carbonell & Goldstein, 1998)
5. **xQuAD**: "Diversifying Search Results" (Santos et al., 2010)

### 8.2. Documentation

- **FashionCLIP**: `backend/fashion-service/models/FashionCLIP.py`
- **Recommendation Service**: `backend/fashion-service/services/recommendation_service.py`
- **Business Rules**: `backend/fashion-service/utils/filters.py`
- **Events API Client**: `backend/fashion-service/utils/events_api_client.py`

### 8.3. External Resources

- **FAISS**: https://github.com/facebookresearch/faiss
- **CLIP**: https://github.com/openai/CLIP
- **XGBoost**: https://xgboost.readthedocs.io/
- **LightGBM**: https://lightgbm.readthedocs.io/

---

**Tác giả**: AI Assistant  
**Ngày tạo**: 2025-01-XX  
**Phiên bản**: 1.0  
**Cập nhật lần cuối**: 2025-01-XX

