# Fashion E-commerce Website

Modern full‑stack fashion e‑commerce built with microservices, React, Node.js and MongoDB. Includes a basic personalized recommendations pipeline (events → retrieval → UI).

## 🏗️ Architecture

Microservices currently included:

- **Frontend**: React + TypeScript + Tailwind (Dev: http://localhost:5173)
- **API Gateway**: Node.js/Express (3000) – reverse proxy to services
- **User Service**: Node.js/Express + MongoDB (3001)
- **Product Service**: Node.js/Express + MongoDB (3002)
- **Order Service**: Node.js/Express + MongoDB (3003)
- **Fashion Service (Recommendations)**: Python/Flask + FAISS/CLIP (3008)
- **Database**: MongoDB

## 🚀 Features

### Core E‑commerce
- ✅ User registration/authentication
- ✅ Product catalog with search & filtering
- ✅ Shopping cart
- ✅ Order creation and management
- ✅ User profile

### Observability & Infra
- ✅ Microservices via API Gateway
- ✅ MongoDB per service
- ✅ Docker Compose (dev/prod)

### Recommendations (Phase 0–3 Completed)
- ✅ Event pipeline (frontend batching → gateway → order‑service → Mongo)
  - Endpoints: `POST /api/events/batch`, `GET /api/events/metrics`
- ✅ Aggregations for analytics: `top-viewed`, `popularity`, `affinity`
- ✅ Admin dashboard widget for recommendation events
- ✅ Retrieval (Stage 1) – personalized candidates from recent views
  - Endpoint: `POST /api/recommendations/retrieve/personalized`
- ✅ Frontend integration: Home shows “Recommended for You” personalized by recent interactions

Note: Ranking (Stage 2), orchestrated flow and A/B flags are planned next.

## 📁 Project Structure

```
Fashion-Ecommerce-website/
├── backend/
│   ├── api-gateway/
│   ├── user-service/
│   ├── product-service/
│   ├── order-service/
│   └── fashion-service/       # Recommendation service (FAISS/CLIP)
├── frontend/
├── docker/
├── docker-compose.yml
└── README.md
```

## 🛠️ Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **Git**

## 🚀 Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd Fashion-Ecommerce-website
   ```

2. Copy and update env files (MongoDB Atlas URIs, service URLs)
   - See `env.example` for sample Atlas credentials

3. Start core services with Docker Compose
   ```bash
   docker-compose up --build
   ```

4. Access
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:3000/api


### Fashion Service (Recommendations) – run separately

Due to memory footprint (FAISS + model), run `fashion-service` in its own Docker container (not inside the shared compose group) to avoid OOM on low‑RAM machines.

Example run:
```bash
cd backend/fashion-service
docker build -t fashion-service:latest .
docker run --rm -p 3008:3008 \
  -e RECOMMEND_SERVICE_PORT=3008 \
  -e PRODUCT_SERVICE_URL=http://host.docker.internal:3002 \
  fashion-service:latest
```

Make sure the model/index files are present in `backend/fashion-service/models/` or mount them as volumes if customized.

### Manual Setup

1. MongoDB (Atlas)
   - This project uses MongoDB Atlas (cloud). No local `localhost:27017` is required.
   - Provide Atlas connection strings in each service `.env`.

2. **Install and start services**

   **User Service:**
   ```bash
   cd backend/user-service
   npm install
   cp env.example .env
   # Edit .env with your MongoDB connection string
   npm run dev
   ```

   **Product Service:**
   ```bash
   cd backend/product-service
   npm install
   cp env.example .env
   # Edit .env with your MongoDB connection string
   npm run dev
   ```

   **Order Service:**
   ```bash
   cd backend/order-service
   npm install
   cp env.example .env
   # Edit .env with your MongoDB connection string
   npm run dev
   ```

   **API Gateway:**
   ```bash
   cd backend/api-gateway
   npm install
   cp env.example .env
   # Edit .env with service URLs
   npm run dev
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## 🔧 Environment Variables

### User Service (.env)
```env
PORT=3001
MONGODB_URI=mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/fashion_ecommerce_users?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

### Product Service (.env)
```env
PORT=3002
MONGODB_URI=mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/fashion_ecommerce_products?retryWrites=true&w=majority
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Order Service (.env)
```env
PORT=3003
MONGODB_URI=mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/fashion_ecommerce_orders?retryWrites=true&w=majority
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
```

### API Gateway (.env)
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000/api
```

## 📚 Key APIs (Implemented)

- Events Ingest: `POST /api/events/batch`
- Events Metrics: `GET /api/events/metrics` (and `/aggregates/top-viewed|popularity|affinity`)
- Recommendations (Retrieval): `POST /api/recommendations/retrieve/personalized`
- Product listing/search (via Product Service): `/api/products`, `/api/products/:id`
## 🧪 Testing

### Run tests for individual services
```bash
# User Service
cd services/user-service
npm test

# Product Service
cd services/product-service
npm test

# Order Service
cd services/order-service
npm test

# API Gateway
cd services/api-gateway
npm test
```

### Run frontend tests
```bash
cd frontend
npm test
```

## 🐳 Docker Commands

### Development
```bash
# Start core services
docker-compose up --build

# View logs
docker-compose logs -f api-gateway

# Stop
docker-compose down
```

### Production
```bash
# Start all services in production mode
docker-compose up --build -d

# Stop all services
docker-compose down

# Remove volumes (WARNING: This will delete all data)
docker-compose down -v
```

## 🔍 Monitoring and Health Checks

- API Gateway Health: `http://localhost:3000/health`
- Order Service Health: `http://localhost:3003/health`
- Fashion Service Health/Stats: `http://localhost:3008/health`, `GET /api/recommendations/stats`

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Backend Development**: Node.js/Express microservices
- **Frontend Development**: React with TypeScript
- **Database Design**: MongoDB with Mongoose
- **DevOps**: Docker containerization

## 📞 Support

If you have any questions or need help, please:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed description
3. Contact the development team

## 🔮 Future Roadmap

- [ ] Recommendation system integration
- [ ] Payment gateway integration
- [ ] Email notifications
- [ ] Admin dashboard
- [ ] Mobile app
- [ ] Performance optimization
- [ ] CI/CD pipeline
- [ ] Kubernetes deployment

---

**Happy Coding! 🎉**
