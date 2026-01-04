# Fashion E-commerce Website

A modern full-stack e-commerce website specializing in clothing products, built with a microservices architecture using React, Node.js, Express, and MongoDB.

## 🏗️ Architecture

This project follows a microservices architecture with the following components:

- **Frontend**: React with TypeScript, Tailwind CSS (Dev server: http://localhost:5173)
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
├── backend/
│   ├── user-service/          # User management microservice
│   ├── product-service/       # Product catalog microservice
│   ├── order-service/         # Order management microservice
│   ├── chatbot-service/       # AI Chatbot service
│   ├── fashion-service/       # Fashion recommendation service (Python)
│   └── api-gateway/           # API Gateway
├── frontend/                  # React frontend application
├── docker-compose.yml         # Production Docker Compose
├── docker-compose.dev.yml     # Development Docker Compose
├── .env                       # Environment variables (create from template)
└── README.md
```

## 🛠️ Prerequisites

Before running this project, make sure you have the following installed:

- **Docker** and **Docker Compose** (Required for Docker setup)
- **Node.js** (v20 or higher) - Only needed for manual setup
  - **Frontend requires Node.js 20+** (Vite 7, React Router 7 require Node 20+)
  - Backend services work with Node.js 18+
- **Git**

**Note**: If using Docker (recommended), you don't need Node.js installed on your machine! Docker will use the correct Node.js version automatically.

## 🚀 Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Fashion-Ecommerce-website
   ```

2. **Create `.env` file in the root directory**
   
   Create a `.env` file in the root directory with the following content:
   ```env
   # MongoDB Atlas Credentials
   MONGODB_USERNAME=your_mongodb_username
   MONGODB_PASSWORD=your_mongodb_password
   MONGODB_CLUSTER=your_cluster.mongodb.net

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Internal Service Token
   INTERNAL_SERVICE_TOKEN=internal-service-secret

   # Environment
   NODE_ENV=development

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

   # Google Gemini API Configuration (for Chatbot)
   GEMINI_API_KEY=your_gemini_api_key

   # SMTP Configuration (Optional, for email services)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   ```

   **Note**: Replace all placeholder values with your actual credentials.

3. **Start all services with Docker Compose**
   ```bash
   # For production (recommended)
   docker-compose up --build

   # For development (with hot reload)
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - API Gateway: http://localhost:3000/api
   - Health Check: http://localhost:3000/health

**✨ That's it!** Docker will automatically:
- Build all service containers
- Install all dependencies inside containers (no need to install on your machine)
- Set up networking between services
- Start all services

**No need to install Node.js or npm on your machine!** Everything runs inside Docker containers.


### Option 2: Manual Setup

1. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password123 mongo:7.0
   ```

2. **Create `.env` file in the root directory**
   
   See the environment variables section below for the complete `.env` template.

3. **Install and start services**

   **User Service:**
   ```bash
   cd backend/user-service
   npm install
   npm run dev
   ```

   **Product Service:**
   ```bash
   cd backend/product-service
   npm install
   npm run dev
   ```

   **Order Service:**
   ```bash
   cd backend/order-service
   npm install
   npm run dev
   ```

   **Chatbot Service:**
   ```bash
   cd backend/chatbot-service
   npm install
   npm run dev
   ```

   **API Gateway:**
   ```bash
   cd backend/api-gateway
   npm install
   npm run dev
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   
   **Note**: Frontend uses Vite + React + TypeScript. Make sure all dependencies are installed before running.

## 🔧 Environment Variables

### Root `.env` File (Required for Docker Compose)

Create a `.env` file in the root directory of the project. This file is used by `docker-compose.yml` to configure all services:

```env
# MongoDB Atlas Credentials
MONGODB_USERNAME=your_mongodb_username
MONGODB_PASSWORD=your_mongodb_password
MONGODB_CLUSTER=your_cluster.mongodb.net

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Cloudinary Configuration (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Internal Service Token (for inter-service communication)
INTERNAL_SERVICE_TOKEN=internal-service-secret

# Environment
NODE_ENV=development

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Google Gemini API Configuration (for Chatbot)
GEMINI_API_KEY=your_gemini_api_key

# SMTP Configuration (Optional, for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Service-Specific Environment Variables

When running services manually (without Docker), each service may need its own `.env` file. The Docker Compose setup automatically configures these from the root `.env` file.

**Note**: 
- For MongoDB Atlas, the connection string is automatically constructed as: `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}/database_name`
- Services use separate databases: `users`, `products`, `orders`
- All services share the same root `.env` file when using Docker Compose

## 📚 API Documentation

### Swagger/OpenAPI Documentation

All backend services have Swagger documentation available for testing and exploring APIs:

#### Access Swagger UI

- **User Service**: http://localhost:3001/api-docs
- **Product Service**: http://localhost:3002/api-docs
- **Order Service**: http://localhost:3003/api-docs
- **Chatbot Service**: http://localhost:3009/api-docs
- **Fashion Service** (Python): http://localhost:3008/api-docs

#### Features

- ✅ Interactive API testing directly from browser
- ✅ Complete request/response schemas
- ✅ Authentication support (JWT Bearer tokens)
- ✅ Try it out functionality for all endpoints
- ✅ Auto-generated from code comments

#### Using Swagger UI

1. **Access the Swagger UI**: Navigate to `/api-docs` endpoint of any service
2. **Authenticate** (if needed): Click "Authorize" button and enter your JWT token
3. **Test Endpoints**: 
   - Click on any endpoint to expand
   - Click "Try it out"
   - Fill in parameters/request body
   - Click "Execute" to send request
   - View response below

#### Example: Testing User Login

1. Go to http://localhost:3001/api-docs
2. Find `POST /api/auth/login`
3. Click "Try it out"
4. Enter credentials:
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```
5. Click "Execute"
6. Copy the `token` from response
7. Click "Authorize" at top and paste token to test authenticated endpoints

#### Services with Swagger

| Service | Port | Swagger URL | Status |
|---------|------|-------------|--------|
| User Service | 3001 | http://localhost:3001/api-docs | ✅ Complete |
| Product Service | 3002 | http://localhost:3002/api-docs | ✅ Complete |
| Order Service | 3003 | http://localhost:3003/api-docs | ✅ Complete |
| Chatbot Service | 3009 | http://localhost:3009/api-docs | ✅ Complete |
| Fashion Service | 3008 | http://localhost:3008/api-docs | ✅ Complete |

**Note**: After adding Swagger to services, rebuild Docker containers:
```bash
docker compose build
docker compose up
```


## 🧪 Testing

### Run tests for individual services
```bash
# User Service
cd backend/user-service
npm test

# Product Service
cd backend/product-service
npm test

# Order Service
cd backend/order-service
npm test

# API Gateway
cd backend/api-gateway
npm test

# Chatbot Service
cd backend/chatbot-service
npm test
```

### Run frontend tests
```bash
cd frontend
npm test
```


**Happy Coding! 🎉**
