# Fashion Service Integration Guide

## 🚀 Quick Integration

### 1. Start the Service
```bash
cd backend/fashion-service
python main.py
```

### 2. Test the Service
```bash
python test.py
```

### 3. Integrate with Frontend

The Fashion Service provides these API endpoints for your frontend:

### Build Visual Similarity Index (optional but recommended)

To enable real "similar by image" recommendations using your Cloudinary image URLs:

```bash
# 1) Create embeddings and index from your export
python backend/fashion-service/scripts/build_index_from_export.py \
  --export backend/product-service/exports/database-export.json

# 2) Start the service (reads .env for PORT, Mongo)
python backend/fashion-service/main.py
```

When the embeddings and index exist in `backend/fashion-service/data/embeddings/`,
the endpoint `POST /api/v1/recommendations/product/{product_id}` will use FAISS
nearest neighbors on image embeddings and return similar products. If the index is
missing, it falls back to random sampling from Mongo.

#### **Get User Recommendations**
```javascript
// In your React component
const getRecommendations = async (userId) => {
  const response = await fetch(`http://localhost:8000/api/v1/recommendations/user/${userId}?k=8`);
  const data = await response.json();
  return data.data; // Array of recommended products
};
```

#### **Get Similar Products**
```javascript
// Get similar products for a specific product
const getSimilarProducts = async (productId) => {
  const response = await fetch(`http://localhost:8000/api/v1/recommendations/product/${productId}?k=6`);
  const data = await response.json();
  return data.data; // Array of similar products
};
```

#### **Track User Interactions**
```javascript
// Track when user views a product
const trackInteraction = async (userId, productId, interactionType) => {
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('product_id', productId);
  formData.append('interaction_type', interactionType);
  
  await fetch('http://localhost:8000/api/v1/track/interaction', {
    method: 'POST',
    body: formData
  });
};
```

## 🔧 Frontend Integration Examples

### **Homepage with Recommendations**
```jsx
// In your Home.tsx
import { useState, useEffect } from 'react';

function Home() {
  const [recommendations, setRecommendations] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      fetch(`http://localhost:8000/api/v1/recommendations/user/${user.id}?k=8`)
        .then(res => res.json())
        .then(data => setRecommendations(data.data));
    }
  }, [user]);

  return (
    <div>
      <h2>Recommended for You</h2>
      <div className="grid grid-cols-4 gap-4">
        {recommendations.map(product => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

### **Product Detail Page with Similar Products**
```jsx
// In your ProductDetail.tsx
function ProductDetail({ productId }) {
  const [similarProducts, setSimilarProducts] = useState([]);

  useEffect(() => {
    fetch(`http://localhost:8000/api/v1/recommendations/product/${productId}?k=6`)
      .then(res => res.json())
      .then(data => setSimilarProducts(data.data));
  }, [productId]);

  return (
    <div>
      {/* Product details */}
      <h3>Similar Products</h3>
      <div className="grid grid-cols-3 gap-4">
        {similarProducts.map(product => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

### **Track User Interactions**
```jsx
// In your ProductCard.tsx
import { useAuth } from '../contexts/AuthContext';

function ProductCard({ product }) {
  const { user } = useAuth();

  const handleProductView = async () => {
    if (user?.id) {
      await fetch('http://localhost:8000/api/v1/track/interaction', {
        method: 'POST',
        body: new FormData([
          ['user_id', user.id],
          ['product_id', product._id],
          ['interaction_type', 'view']
        ])
      });
    }
  };

  useEffect(() => {
    handleProductView();
  }, [product._id, user?.id]);

  return (
    <div onClick={() => trackInteraction('click')}>
      {/* Product card content */}
    </div>
  );
}
```

## 🐳 Docker Integration

### **Add to docker-compose.yml**
```yaml
fashion-service:
  build: ./backend/fashion-service
  ports:
    - "8000:8000"
  environment:
    - MONGODB_URI=mongodb://mongodb:27017
  depends_on:
    - mongodb
```

### **Start with Docker**
```bash
docker-compose up fashion-service
```

## 🔗 API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/products/{id}` | GET | Get product details |
| `/api/v1/recommendations/user/{id}` | POST | Get user recommendations |
| `/api/v1/recommendations/product/{id}` | POST | Get similar products |
| `/api/v1/track/interaction` | POST | Track user interactions |

## 🎯 Next Steps

1. **Start the service**: `python main.py`
2. **Test it**: `python test.py`
3. **Integrate with frontend**: Use the examples above
4. **Deploy**: Add to your docker-compose.yml

The Fashion Service is now ready to provide AI-powered recommendations to your e-commerce platform! 🚀
