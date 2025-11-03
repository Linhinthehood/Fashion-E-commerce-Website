# Recommend Service

AI-powered product recommendation service using FashionCLIP and FAISS for similarity search.

## Features

- **Similar Product Recommendations**: Find visually similar products using AI
- **Image Search**: Upload an image to find matching products
- **Batch Recommendations**: Get recommendations for multiple products at once
- **Smart Filtering**: Category pre-filtering with scoring system (price, gender, usage, brand)
- **Fast Vector Search**: FAISS-indexed embeddings for instant results

## Prerequisites

- Python 3.8+
- Product Service running on port 3002
- Required model files in `models/` directory:
  - `fashion_clip_best.pt`
  - `cloud_gallery_ip.index` (optional, for FAISS)
  - `cloud_gallery_embeddings.npz` (optional, for FAISS)

## Installation

### Quick Start (Recommended)

1. Create and activate virtual environment:
```bash
cd backend/fashion-service
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

**OR** use the provided script:
```bash
chmod +x start.sh
./start.sh
```

### Configuration (Optional)

Create `.env` file to customize settings:
```env
RECOMMEND_SERVICE_PORT=3008
PRODUCT_SERVICE_URL=http://localhost:3002
FASHION_MODEL_PATH=models/fashion_clip_best.pt
FAISS_INDEX_PATH=models/cloud_gallery_ip.index
NPZ_PATH=models/cloud_gallery_embeddings.npz
```

## Running the Service

### First Time Setup
```bash
cd backend/fashion-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Subsequent Runs
```bash
cd backend/fashion-service
source venv/bin/activate
python main.py
```

The service will start on `http://localhost:3008`

### Verify Service is Running
```bash
curl http://localhost:3008/health
```

For detailed instructions, see [QUICKSTART.md](QUICKSTART.md)

## API Endpoints

### Health Check
```
GET /health
```

### Get Product Recommendations
```
GET /api/recommendations/product/{productId}?limit=6&minSimilarity=0.6
```

### Find Similar Products
```
POST /api/recommendations/similar
Content-Type: application/json

{
  "productId": "68e8dcb2d78957d01e035435",
  "limit": 6,
  "options": {
    "minSimilarity": 0.6,
    "sameCategoryOnly": true
  }
}
```

### Search by Image
```
POST /api/recommendations/search-by-image
Content-Type: application/json

{
  "imageUrl": "https://example.com/image.jpg",
  "limit": 10,
  "options": {
    "minSimilarity": 0.6
  }
}
```

### Batch Recommendations
```
POST /api/recommendations/batch
Content-Type: application/json

{
  "productIds": ["id1", "id2", "id3"],
  "limit": 3
}
```

### Service Statistics
```
GET /api/recommendations/stats
```

## Testing with Postman

Import `test-similarity.json` collection for ready-to-use API requests.

## Architecture

- **Flask**: Web framework
- **FashionCLIP**: Vision-language model for product embeddings
- **FAISS**: Fast similarity search with vector indexing
- **API Client**: Communicates with Product Service for product data

## Modes

- **FAISS Mode**: Fast pre-indexed search (if index files exist)
- **On-the-fly Mode**: Real-time embedding generation (fallback)

## Filtering System

- **Hard Filter**: Category matching (articleType, masterCategory, subCategory)
- **Soft Scoring**: Price (±10%/5%), Gender (±8%/10%), Usage (±8%/8%), Brand (+5%)
