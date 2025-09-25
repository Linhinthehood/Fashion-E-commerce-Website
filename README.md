# Fashion E-commerce Website

A modern full-stack e-commerce website specializing in clothing products, built with a microservices architecture using React, Node.js, Express, and MongoDB.

## 🏗️ Architecture

This project follows a microservices architecture with the following components:

- **Frontend**: React with TypeScript, Tailwind CSS
- **API Gateway**: Node.js/Express (Port 3000)
- **User Service**: Node.js/Express + MongoDB (Port 3001)
- **Product Service**: Node.js/Express + MongoDB (Port 3002)
- **Order Service**: Node.js/Express + MongoDB (Port 3003)
- **Database**: MongoDB
- **Database Admin**: Mongo Express 

## 🚀 Features

### Core E-commerce Features
- ✅ User registration and authentication
- ✅ Product catalog with search and filtering
- ✅ Shopping cart management
- ✅ Order processing and management
- ✅ User profile management

### Technical Features
- ✅ Microservices architecture
- ✅ API Gateway with load balancing
- ✅ JWT-based authentication
- ✅ MongoDB with separate databases per service
- ✅ Docker containerization
- ✅ TypeScript for type safety
- ✅ Responsive design with Tailwind CSS
- ✅ State management with Zustand
- ✅ API integration with React Query

### Future Features (Recommendation System)
- 🔄 Product recommendation engine (Python + FastAPI)
- 🔄 User behavior tracking
- 🔄 Collaborative filtering
- 🔄 Content-based filtering

## 📁 Project Structure

```
Fashion-Ecommerce-website/
├── services/
│   ├── user-service/          # User management microservice
│   ├── product-service/       # Product catalog microservice
│   ├── order-service/         # Order management microservice
│   └── api-gateway/           # API Gateway
├── frontend/                  # React frontend application
├── shared/                    # Shared utilities and types
├── docker/                    # Docker configurations
├── docker-compose.yml         # Production Docker Compose
├── docker-compose.dev.yml     # Development Docker Compose
└── README.md
```

## 🛠️ Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose**
- **Git**

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Fashion-Ecommerce-website
   ```

2. **Start all services with Docker Compose**
   ```bash
   # For development (with hot reload)
   docker-compose -f docker-compose.dev.yml up --build

   # For production
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:3000/api
   - Database Admin: http://localhost:8081 (admin/admin123)

### Option 2: Manual Setup

1. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password123 mongo:7.0
   ```

2. **Install and start services**

   **User Service:**
   ```bash
   cd services/user-service
   npm install
   cp env.example .env
   # Edit .env with your MongoDB connection string
   npm run dev
   ```

   **Product Service:**
   ```bash
   cd services/product-service
   npm install
   cp env.example .env
   # Edit .env with your MongoDB connection string
   npm run dev
   ```

   **Order Service:**
   ```bash
   cd services/order-service
   npm install
   cp env.example .env
   # Edit .env with your MongoDB connection string
   npm run dev
   ```

   **API Gateway:**
   ```bash
   cd services/api-gateway
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
MONGODB_URI=mongodb://localhost:27017/fashion_ecommerce_users
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
```

### Product Service (.env)
```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/fashion_ecommerce_products
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Order Service (.env)
```env
PORT=3003
MONGODB_URI=mongodb://localhost:27017/fashion_ecommerce_orders
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
REACT_APP_API_URL=http://localhost:3000/api
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Product Endpoints
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/:id` - Get single product
- `GET /api/products/featured` - Get featured products
- `GET /api/products/new` - Get new products
- `GET /api/products/bestsellers` - Get best sellers
- `GET /api/products/search` - Search products
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get single category

### Order Endpoints (Protected)
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/cancel` - Cancel order

### Cart Endpoints (Protected)
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item
- `DELETE /api/cart/remove` - Remove item from cart
- `DELETE /api/cart/clear` - Clear cart

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
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up --build

# Start specific service
docker-compose -f docker-compose.dev.yml up user-service

# View logs
docker-compose -f docker-compose.dev.yml logs -f user-service

# Stop all services
docker-compose -f docker-compose.dev.yml down
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

- **API Gateway Health**: http://localhost:3000/health
- **Service Health**: http://localhost:3000/health/detailed
- **Database Admin**: http://localhost:8081

## 🚀 Deployment

### Production Deployment

1. **Update environment variables** for production
2. **Build and push Docker images** to your registry
3. **Deploy using Docker Compose** or orchestration platform
4. **Set up reverse proxy** (Nginx) for SSL termination
5. **Configure monitoring** and logging

### Environment-specific configurations

- **Development**: Use `docker-compose.dev.yml`
- **Production**: Use `docker-compose.yml`
- **Staging**: Create `docker-compose.staging.yml`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

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
