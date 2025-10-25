# Fashion Service - AI-Powered Recommendations

A FastAPI-based service that provides AI-powered fashion recommendations for your e-commerce platform.

## 🚀 Quick Start

### Option 1: Simple Mode (Recommended for testing)
```bash
python main_simple.py
```

### Option 2: Environment Mode (Recommended for development)
```bash
# Create .env file
echo "MONGODB_URI=mongodb://localhost:27017" > .env
echo "MONGODB_DATABASE=fashion_ecommerce_products" >> .env

# Install dependencies
pip install python-dotenv

# Start service
python main_with_env.py
```

### Option 3: Full AI Mode (Advanced)
```bash
python main.py
```

## 🧪 Testing

```bash
# Test basic functionality
python test_minimal.py
```

## 📚 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔧 API Endpoints

- `GET /health` - Health check
- `GET /api/v1/products/{product_id}` - Get product details
- `POST /api/v1/recommendations/product/{product_id}` - Get similar products
- `POST /api/v1/recommendations/user/{user_id}` - Get user recommendations
- `POST /api/v1/track/interaction` - Track user interactions

## 🐳 Docker

```bash
# Build and run with Docker
docker build -t fashion-service .
docker run -p 8000:8000 fashion-service
```

## 🔗 Integration

This service integrates with your main e-commerce application through API calls. The frontend can call these endpoints to get AI-powered recommendations.
