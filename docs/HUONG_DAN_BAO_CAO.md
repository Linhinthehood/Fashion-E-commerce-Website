# HƯỚNG DẪN VIẾT BÁO CÁO - HỆ THỐNG RECOMMENDATION

## 📋 MỤC LỤC
1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Mô hình Deep Learning](#2-mô-hình-deep-learning)
3. [Thuật toán Recommendation](#3-thuật-toán-recommendation)
4. [Input/Output của các thành phần](#4-inputoutput-của-các-thành-phần)
5. [Tích hợp Frontend](#5-tích-hợp-frontend)
6. [Luồng xử lý dữ liệu](#6-luồng-xử-lý-dữ-liệu)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1. Kiến trúc tổng thể
Hệ thống recommendation sử dụng **Content-Based Filtering** kết hợp với **Visual Similarity** để gợi ý sản phẩm tương tự dựa trên hình ảnh.

**Các thành phần chính:**
- **FashionCLIP Model**: Mô hình deep learning để encode hình ảnh thành vector embeddings
- **FAISS Index**: Cơ sở dữ liệu vector để tìm kiếm nhanh (Approximate Nearest Neighbors)
- **Recommendation Service**: API service xử lý logic gợi ý
- **Business Rules Engine**: Bộ lọc và scoring dựa trên quy tắc kinh doanh

### 1.2. Công nghệ sử dụng
- **Python 3.8+**: Backend service
- **PyTorch**: Deep learning framework
- **Transformers (Hugging Face)**: CLIP model
- **FAISS (Facebook AI Similarity Search)**: Vector search engine
- **Flask**: Web framework cho API
- **React + TypeScript**: Frontend

---

## 2. MÔ HÌNH DEEP LEARNING

### 2.1. FashionCLIP Model

#### 2.1.1. Kiến trúc
**Base Model**: CLIP (Contrastive Language-Image Pre-training) từ OpenAI
- **Model name**: `openai/clip-vit-base-patch32`
- **Vision Encoder**: Vision Transformer (ViT-Base/32)
- **Text Encoder**: Transformer-based text encoder

**Customization**:
- Thêm **Projection Heads** để giảm chiều embedding xuống **256D**
- Sử dụng **Layer Normalization** để ổn định training
- Output embeddings được **L2-normalized** (độ dài vector = 1)

#### 2.1.2. Model có tự train không?
**CÓ** - Model FashionCLIP đã được train và lưu trong checkpoint:
- **File checkpoint**: `models/fashion_clip_best.pt`
- **Cấu trúc checkpoint**:
  ```python
  {
    "model_state_dict": {...},  # Trọng số đã train
    "config": {
      "model_name": "openai/clip-vit-base-patch32",
      "embedding_dim": 256,
      "max_length": 77,
      "image_size": 224
    }
  }
  ```

**Quá trình training** (có thể đã thực hiện trước):
1. Fine-tune CLIP base model trên dataset thời trang
2. Train projection heads để map CLIP embeddings (512D) → Fashion embeddings (256D)
3. Sử dụng contrastive learning để học representation tốt hơn cho fashion domain

#### 2.1.3. Input/Output của FashionCLIP

**INPUT:**
- **Hình ảnh**: PIL Image (RGB, 224x224 pixels)
- **Text** (optional): String hoặc empty string `""` cho image-only encoding
- **Processing**:
  - Resize về 224x224
  - Normalize pixel values
  - Tokenize text (nếu có)

**OUTPUT:**
- **Image Embedding**: Vector 256 chiều (float32), đã normalize L2
- **Text Embedding**: Vector 256 chiều (float32), đã normalize L2 (nếu có text input)

**Ví dụ:**
```python
# Input: Hình ảnh sản phẩm
image = Image.open("product.jpg")  # PIL Image

# Output: Vector embedding
embedding = model.encode_image(image)  
# Shape: (256,) - Vector 256 chiều
# Norm: ||embedding|| = 1.0 (L2 normalized)
```

---

## 3. THUẬT TOÁN RECOMMENDATION

### 3.1. Thuật toán tìm kiếm tương tự (Similar Product Search)

#### 3.1.1. FAISS Index Search

**FAISS (Facebook AI Similarity Search)** là thư viện tối ưu cho tìm kiếm vector similarity.

**Index Type**: `IndexFlatIP` (Inner Product)
- Phù hợp với **cosine similarity** vì embeddings đã được normalize L2
- Công thức: `cosine_similarity = dot_product(a, b)` khi ||a|| = ||b|| = 1

**Quy trình:**
1. **Pre-compute embeddings**: Tất cả sản phẩm được encode thành embeddings và lưu vào FAISS index
2. **Query embedding**: Encode sản phẩm query thành embedding
3. **Search**: FAISS tìm top-K vectors gần nhất (khoảng cách nhỏ nhất = similarity cao nhất)
4. **Return**: Danh sách sản phẩm tương tự với similarity scores

**Input:**
- Query embedding: Vector 256D
- K: Số lượng kết quả cần tìm (ví dụ: 50)

**Output:**
- Similarities: Array các similarity scores (float, range [0, 1])
- Indices: Array các chỉ số trong index (để map về sản phẩm)

#### 3.1.2. Cosine Similarity

**Công thức:**
```
similarity = dot_product(embedding_A, embedding_B) / (||embedding_A|| * ||embedding_B||)
```

Vì embeddings đã normalize L2 (||embedding|| = 1), công thức đơn giản thành:
```
similarity = dot_product(embedding_A, embedding_B)
```

**Range**: [0, 1]
- **1.0**: Hoàn toàn giống nhau
- **0.0**: Không liên quan

### 3.2. Thuật toán Personalized Recommendation

#### 3.2.1. Aggregation-based Approach

**Thuật toán**: Gộp kết quả từ nhiều seed items (sản phẩm người dùng đã xem/thêm giỏ/mua)

**Quy trình chi tiết:**

```
1. INPUT: recent_item_ids = [id1, id2, id3, ..., id10]  (tối đa 10 items)

2. Với mỗi seed_id trong recent_item_ids:
   a. Tìm top-50 sản phẩm tương tự với seed_id (dùng FAISS)
   b. Lấy similarity scores
   
3. AGGREGATION (Gộp kết quả):
   - Với mỗi sản phẩm xuất hiện trong nhiều seed results:
     - Lấy MAX similarity score (điểm cao nhất)
     - Lưu vào aggregate_scores[product_id] = max_score
   
4. RANKING:
   - Sắp xếp aggregate_scores theo thứ tự giảm dần
   - Lấy top-N (limit) sản phẩm có điểm cao nhất
   
5. OUTPUT: Danh sách candidates với scores
```

**Ví dụ minh họa:**
```
Seed 1 (Áo thun) → [Quần jean: 0.85, Áo sơ mi: 0.80, Giày: 0.75]
Seed 2 (Quần jean) → [Áo thun: 0.90, Quần short: 0.82, Giày: 0.78]
Seed 3 (Giày) → [Tất: 0.88, Quần jean: 0.80, Áo thun: 0.70]

Aggregation (MAX):
- Áo thun: max(0.90, 0.70) = 0.90
- Quần jean: max(0.85, 0.80) = 0.85
- Giày: max(0.75, 0.78) = 0.78
- Áo sơ mi: 0.80
- Quần short: 0.82
- Tất: 0.88

Ranking (top-3):
1. Áo thun: 0.90
2. Tất: 0.88
3. Quần jean: 0.85
```

#### 3.2.2. Input/Output của Personalized Recommendation

**INPUT:**
```json
{
  "recentItemIds": ["product_id_1", "product_id_2", ...],  // Tối đa 10
  "limit": 50,  // Số lượng candidates muốn nhận
  "options": {}  // Tùy chọn (chưa sử dụng)
}
```

**OUTPUT:**
```json
{
  "candidates": [
    {
      "product": {
        "_id": "product_id",
        "name": "Tên sản phẩm",
        "brand": "Thương hiệu",
        "images": ["url1", "url2"],
        "defaultPrice": 500000,
        ...
      },
      "score": 0.9234  // Aggregated similarity score
    },
    ...
  ],
  "count": 50,
  "method": "seeds-faiss-aggregate"
}
```

### 3.3. Business Rules & Scoring

#### 3.3.1. Hard Filter: Category Matching
**Quy tắc**: Chỉ giữ lại sản phẩm cùng category với target product
- **Fields kiểm tra**: `articleType`, `masterCategory`, `subCategory`
- **Logic**: Tất cả 3 fields phải khớp (nếu có giá trị)

**Ví dụ:**
```
Target: { articleType: "T-Shirt", masterCategory: "Apparel", subCategory: "Topwear" }
Candidate: { articleType: "T-Shirt", masterCategory: "Apparel", subCategory: "Topwear" } ✅ PASS
Candidate: { articleType: "Jeans", masterCategory: "Apparel", subCategory: "Bottomwear" } ❌ FILTERED OUT
```

#### 3.3.2. Soft Scoring: Boost/Penalty System

Thay vì loại bỏ sản phẩm, hệ thống **điều chỉnh điểm similarity** dựa trên các tiêu chí:

**1. Price Scoring:**
- **Trong khoảng giá** (±tolerance): **+10% boost**
- **Ngoài khoảng giá**: **-5% penalty**
- **Tolerance mặc định**: 50% (có thể cấu hình)

**2. Gender Scoring:**
- **Exact match** (Male-Male, Female-Female): **+8% boost**
- **Unisex** (một trong hai là Unisex): **+5% boost**
- **Mismatch** (Male-Female): **-10% penalty**

**3. Usage Scoring:**
- **Exact match** (Casual-Casual, Formal-Formal): **+8% boost**
- **Casual fallback** (một trong hai là Casual): **+3% boost**
- **Mismatch**: **-8% penalty**

**4. Brand Boost:**
- **Cùng brand**: **+5% boost** (có thể cấu hình)

**Ví dụ tính điểm:**
```
Base similarity: 0.80

Price: Trong khoảng → +0.10 → 0.90
Gender: Exact match → +0.08 → 0.98 (cap at 1.0)
Usage: Exact match → +0.08 → 1.0 (cap at 1.0)
Brand: Cùng brand → +0.05 → 1.0 (cap at 1.0)

Final score: 1.0
```

---

## 4. INPUT/OUTPUT CỦA CÁC THÀNH PHẦN

### 4.1. FashionCLIP Model

| Component | Input | Output |
|-----------|-------|--------|
| **FashionCLIP.encode_image()** | PIL Image (224x224, RGB) | Vector 256D (float32, L2-normalized) |
| **FashionCLIP.encode_text()** | Text string (tokenized) | Vector 256D (float32, L2-normalized) |

**Ví dụ code:**
```python
# Input
image = Image.open("product.jpg")  # PIL Image

# Process
pixel_values = processor(images=[image], text=[""], ...)
embedding = model.encode_image(pixel_values)

# Output
print(embedding.shape)  # (256,)
print(np.linalg.norm(embedding))  # 1.0 (L2 normalized)
```

### 4.2. FAISS Index Search

| Component | Input | Output |
|-----------|-------|--------|
| **index.search()** | Query vector (1, 256), K (số kết quả) | Similarities array, Indices array |

**Ví dụ code:**
```python
# Input
query_embedding = np.array([[0.1, 0.2, ..., 0.9]], dtype='float32')  # Shape: (1, 256)
k = 50

# Search
similarities, indices = index.search(query_embedding, k)

# Output
print(similarities.shape)  # (1, 50) - Similarity scores
print(indices.shape)       # (1, 50) - Index positions
print(similarities[0][0])  # 0.9234 - Highest similarity
```

### 4.3. Recommendation Service API

#### 4.3.1. Similar Products Endpoint

**Endpoint**: `POST /api/recommendations/similar`

**INPUT:**
```json
{
  "productId": "68e8dcb2d78957d01e035435",
  "limit": 6,
  "options": {
    "minSimilarity": 0.6,
    "sameCategoryOnly": true,
    "priceTolerance": 0.5,
    "filterGender": true,
    "filterUsage": true,
    "brandBoost": 0.05
  }
}
```

**OUTPUT:**
```json
{
  "recommendations": [
    {
      "product": {
        "_id": "product_id",
        "name": "Tên sản phẩm",
        "brand": "Thương hiệu",
        "images": ["url1"],
        "defaultPrice": 500000,
        "gender": "Male",
        "usage": "Casual",
        "articleType": "T-Shirt",
        "masterCategory": "Apparel",
        "subCategory": "Topwear"
      },
      "similarity": 0.9234
    },
    ...
  ],
  "count": 6,
  "targetProduct": {...},
  "method": "faiss"  // hoặc "on-the-fly"
}
```

#### 4.3.2. Personalized Recommendation Endpoint

**Endpoint**: `POST /api/recommendations/retrieve/personalized`

**INPUT:**
```json
{
  "recentItemIds": ["id1", "id2", "id3"],
  "limit": 50,
  "options": {}
}
```

**OUTPUT:**
```json
{
  "candidates": [
    {
      "product": {...},
      "score": 0.9234
    },
    ...
  ],
  "count": 50,
  "method": "seeds-faiss-aggregate"
}
```

### 4.4. Business Rules Engine

**INPUT:**
- List of (product, similarity_score) tuples
- Target product (để so sánh)
- Options (price_tolerance, filter_gender, etc.)

**OUTPUT:**
- List of (product, adjusted_score) tuples
- Đã được sắp xếp theo score giảm dần
- Đã filter theo category (hard filter)
- Đã điều chỉnh score theo price/gender/usage/brand (soft scoring)

---

## 5. TÍCH HỢP FRONTEND

### 5.1. Các điểm sử dụng trên Frontend

#### 5.1.1. Trang Home (Trang chủ)

**File**: `frontend/src/pages/Home.tsx`

**Chức năng**: Hiển thị gợi ý cá nhân hóa cho người dùng đã đăng nhập

**Code:**
```typescript
// Lấy danh sách sản phẩm người dùng đã xem/thêm giỏ
const response = await fashionApi.getPersonalizedRecommendations(user._id, 8)

// Hiển thị 8 sản phẩm được gợi ý
setRecommendations(response.data)
```

**API Call:**
```typescript
POST /api/recommendations/retrieve/personalized
Body: {
  recentItemIds: ["id1", "id2", ...],  // Từ lịch sử người dùng
  limit: 8
}
```

**UI**: Hiển thị section "Gợi ý dành cho bạn" với 8 sản phẩm

#### 5.1.2. Trang Product Detail (Chi tiết sản phẩm)

**File**: `frontend/src/pages/ProductDetail.tsx`

**Chức năng**: Hiển thị sản phẩm tương tự ở cuối trang

**Code:**
```typescript
// Component SimilarProducts được render
{product && <SimilarProducts productId={product._id} limit={6} />}
```

**Component**: `frontend/src/components/SimilarProducts.tsx`

**API Call:**
```typescript
GET /api/recommendations/product/{productId}?limit=4&minSimilarity=0.7
```

**UI**: Hiển thị section "Sản phẩm tương tự" với 4 sản phẩm có similarity > 70%

### 5.2. API Service Layer

**File**: `frontend/src/utils/apiService.ts`

**Các hàm API:**

1. **getSimilarProducts()**: Lấy sản phẩm tương tự
   ```typescript
   fashionApi.getSimilarProducts(productId, {
     limit: 4,
     minSimilarity: 0.7,
     sameCategoryOnly: true
   })
   ```

2. **getPersonalizedRecommendations()**: Lấy gợi ý cá nhân hóa
   ```typescript
   fashionApi.getPersonalizedRecommendations(userId, 8)
   ```

3. **findSimilarProducts()**: Tìm sản phẩm tương tự với options tùy chỉnh
   ```typescript
   fashionApi.findSimilarProducts({
     productId: "...",
     limit: 6,
     options: {...}
   })
   ```

### 5.3. Luồng dữ liệu Frontend → Backend

```
1. User tương tác (xem sản phẩm, thêm giỏ)
   ↓
2. Frontend gọi API (React component)
   ↓
3. API Gateway proxy request
   ↓
4. Fashion Service nhận request
   ↓
5. Recommendation Service xử lý:
   - Load FashionCLIP model
   - Encode query image → embedding
   - Search FAISS index
   - Apply business rules
   - Return results
   ↓
6. Frontend nhận response và render UI
```

---

## 6. LUỒNG XỬ LÝ DỮ LIỆU

### 6.1. Quy trình tạo Embeddings (Offline)

**File**: `generate_embedding.py`

**Bước 1**: Fetch tất cả sản phẩm từ Product Service
```
GET /api/products?limit=10000
```

**Bước 2**: Với mỗi sản phẩm:
- Lấy URL hình ảnh đầu tiên
- Download image từ URL
- Encode image → embedding (256D) bằng FashionCLIP
- Lưu embedding, URL, product ID, product name

**Bước 3**: Lưu vào NPZ file
```python
np.savez_compressed(
    "cloud_gallery_embeddings.npz",
    vecs=embeddings,      # Array (N, 256)
    urls=image_urls,      # Array (N,)
    ids=product_ids,     # Array (N,)
    names=product_names  # Array (N,)
)
```

**Bước 4**: Build FAISS Index
```python
index = faiss.IndexFlatIP(256)  # Inner Product index
index.add(embeddings)            # Add all embeddings
faiss.write_index(index, "cloud_gallery_ip.index")
```

### 6.2. Quy trình Recommendation (Online)

**Bước 1**: User request
```
GET /api/recommendations/product/{productId}
```

**Bước 2**: Load target product từ database

**Bước 3**: Tìm query embedding
- **Nếu có trong index**: Lấy embedding từ NPZ file
- **Nếu không có**: Generate embedding on-the-fly bằng FashionCLIP

**Bước 4**: Search FAISS
```python
similarities, indices = index.search(query_embedding, k=50)
```

**Bước 5**: Map indices → Products
- Dùng indices để lấy product IDs từ NPZ
- Fetch product details từ database

**Bước 6**: Apply Business Rules
- Hard filter: Category matching
- Soft scoring: Price/Gender/Usage/Brand

**Bước 7**: Rank và limit
- Sắp xếp theo adjusted score
- Lấy top-N

**Bước 8**: Return response

### 6.3. Quy trình Personalized Recommendation

**Bước 1**: User request với recent item IDs
```
POST /api/recommendations/retrieve/personalized
Body: { recentItemIds: ["id1", "id2", ...] }
```

**Bước 2**: Với mỗi seed item:
- Tìm top-50 similar products (dùng FAISS)
- Lấy similarity scores

**Bước 3**: Aggregate results
- Gộp tất cả candidates
- Với mỗi product xuất hiện nhiều lần: lấy MAX score

**Bước 4**: Rank và return top-N

---

## 7. ĐIỂM QUAN TRỌNG CHO BÁO CÁO

### 7.1. Model Training
- ✅ **Model đã được train**: Checkpoint `fashion_clip_best.pt` chứa weights đã fine-tune
- ✅ **Base model**: CLIP từ OpenAI (pretrained)
- ✅ **Customization**: Projection heads (512D → 256D) được train trên fashion dataset
- ✅ **Embedding dimension**: 256 chiều (tối ưu cho FAISS)

### 7.2. Thuật toán chính
1. **Visual Similarity Search**: FAISS + Cosine Similarity
2. **Personalized Aggregation**: MAX similarity từ multiple seeds
3. **Business Rules**: Hybrid scoring (hard filter + soft boost/penalty)

### 7.3. Điểm mạnh
- ✅ **Tốc độ**: FAISS index cho phép tìm kiếm nhanh (milliseconds)
- ✅ **Độ chính xác**: Visual similarity phù hợp với fashion domain
- ✅ **Cá nhân hóa**: Dựa trên lịch sử tương tác của người dùng
- ✅ **Business logic**: Kết hợp similarity với quy tắc kinh doanh

### 7.4. Hạn chế hiện tại
- ⚠️ **Content-based only**: Chưa có collaborative filtering
- ⚠️ **Simple aggregation**: Chỉ dùng MAX, chưa có weighted average
- ⚠️ **No learning-to-rank**: Chưa có model ranking (XGBoost/LightGBM)
- ⚠️ **Cold start**: Người dùng mới chưa có lịch sử → fallback to popular

---

## 8. TÀI LIỆU THAM KHẢO

### 8.1. Files quan trọng
- `models/FashionCLIP.py`: Model architecture
- `services/recommendation_service.py`: Core recommendation logic
- `utils/filters.py`: Business rules engine
- `generate_embedding.py`: Embedding generation script
- `main.py`: API server

### 8.2. Frontend integration
- `frontend/src/pages/Home.tsx`: Personalized recommendations
- `frontend/src/components/SimilarProducts.tsx`: Similar products display
- `frontend/src/utils/apiService.ts`: API client

### 8.3. Documentation
- `README.md`: Service documentation
- `QUICKSTART.md`: Quick start guide
- `docs/RECOMMENDATION_PIPELINE.md`: Pipeline overview

---

## 9. CÂU HỎI THƯỜNG GẶP

### Q1: Model có tự train không?
**A**: Có, model FashionCLIP đã được train và lưu trong `fashion_clip_best.pt`. Model này fine-tune từ CLIP base model với projection heads để phù hợp với fashion domain.

### Q2: Input/Output của model là gì?
**A**: 
- **Input**: Hình ảnh sản phẩm (PIL Image, 224x224)
- **Output**: Vector embedding 256 chiều (float32, L2-normalized)

### Q3: Thuật toán recommendation là gì?
**A**: 
- **Similar products**: FAISS vector search + Cosine similarity
- **Personalized**: Aggregation-based (MAX similarity từ multiple seeds)
- **Business rules**: Hybrid scoring (hard filter + soft boost/penalty)

### Q4: Sử dụng ở đâu trên frontend?
**A**: 
- **Trang Home**: Gợi ý cá nhân hóa (8 sản phẩm)
- **Trang Product Detail**: Sản phẩm tương tự (4 sản phẩm)

### Q5: FAISS là gì?
**A**: Facebook AI Similarity Search - thư viện tối ưu cho tìm kiếm vector similarity. Cho phép tìm top-K nearest neighbors trong milliseconds với hàng triệu vectors.

---

**Tác giả**: AI Assistant  
**Ngày tạo**: 2025-01-XX  
**Phiên bản**: 1.0

