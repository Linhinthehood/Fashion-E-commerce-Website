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

## 🐳 Docker Best Practices & Commands

### How Docker Works in This Project

**Key Concept**: Docker containers are isolated environments that include everything needed to run your application. You don't need to install Node.js, npm, or any dependencies on your local machine!

**What happens when you run `docker-compose up --build`:**

1. **Build Stage**: Docker reads each `Dockerfile` and:
   - Creates a container with Node.js pre-installed
   - Copies `package.json` (and `package-lock.json` if available)
   - Runs `npm install` inside the container to install dependencies
   - Copies your source code
   - Sets up the application

2. **Run Stage**: Each service runs in its own isolated container:
   - All dependencies are inside the container (not on your machine)
   - Services communicate through Docker's internal network
   - Ports are mapped to your host machine (e.g., 3000:3000)

**Benefits:**
- ✅ **No local installation needed**: Tester only needs Docker
- ✅ **Consistent environment**: Same Node.js version everywhere
- ✅ **Isolated dependencies**: No conflicts with other projects
- ✅ **Easy distribution**: Just share the code, Docker handles the rest
- ✅ **Smaller footprint**: Dependencies only exist in containers, not on your machine

### Dockerfile Strategy

Our Dockerfiles use `npm install` instead of `npm ci` because:
- **Flexibility**: Works with or without `package-lock.json`
- **Self-contained**: Container builds itself without requiring pre-generated files
- **Easier distribution**: Just clone and run, no extra setup steps

**Note on `package-lock.json`:**
- If present: `npm install` uses it for faster, reproducible builds
- If absent: `npm install` creates it automatically
- **Best practice**: Commit `package-lock.json` to git for reproducible builds across team members

### Common Docker Commands

#### Development
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

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes (WARNING: This will delete all data)
docker-compose down -v

# Rebuild specific service
docker-compose build user-service
docker-compose up -d user-service
```

### Understanding Dockerfile Structure

Each service has a `Dockerfile` that follows this pattern:

```dockerfile
# 1. Base image with Node.js
FROM node:18-alpine

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy package files first (for Docker layer caching)
COPY package*.json ./

# 4. Install dependencies inside container
RUN npm install --omit=dev && npm cache clean --force

# 5. Copy source code
COPY . .

# 6. Set up non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

# 7. Expose port
EXPOSE 3001

# 8. Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# 9. Start command
CMD ["node", "server.js"]
```

**Why this structure?**
- **Layer caching**: Copying `package.json` first allows Docker to cache the dependency installation layer
- **Security**: Running as non-root user reduces security risks
- **Health checks**: Docker can automatically restart unhealthy containers
- **Alpine Linux**: Smaller image size (faster downloads, less disk space)

### Memory & Resource Usage

**Container vs Local Installation:**

| Aspect | Docker Containers | Local Installation |
|--------|------------------|---------------------|
| **Disk Space** | Dependencies stored in container layers (can be shared) | Dependencies in `node_modules/` on your machine |
| **Memory** | Only running containers use RAM | All installed packages consume disk space |
| **Isolation** | Each project isolated | Can have version conflicts |
| **Cleanup** | `docker-compose down` removes everything | Manual cleanup needed |

**Disk Space Tips:**
- Docker images are cached and shared between projects using same base images
- Use `docker system prune` to clean up unused images/containers
- Containers are lightweight - only source code + dependencies, not the OS

## 🎨 Frontend Development

### Frontend Stack
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Routing**: React Router v7
- **State Management**: React Context API

### Frontend Setup (Manual Development)

If you want to develop the frontend locally without Docker:

**Requirements**: Node.js 20 or higher (required by Vite 7 and React Router 7)

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:5173

**Note**: If you encounter network errors during `npm install`, try:
- Using a different network connection
- Configuring npm registry: `npm config set registry https://registry.npmjs.org/`
- Using `npm install --legacy-peer-deps` if there are peer dependency conflicts

### TypeScript Configuration

The frontend uses TypeScript with strict mode enabled. Key configuration files:
- `tsconfig.json` - Root TypeScript config
- `tsconfig.app.json` - Application TypeScript config
- `tsconfig.node.json` - Node.js TypeScript config (for Vite config)

**Note**: TypeScript errors in IDE are normal if `node_modules` is not installed. Docker will handle dependency installation automatically.

### Frontend Build

```bash
# Development build
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 🔍 Monitoring and Health Checks

- **API Gateway Health**: http://localhost:3000/health
- **Service Health**: http://localhost:3000/health/detailed
- **Frontend**: http://localhost:5173
- **Database Admin**: http://localhost:8081

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
