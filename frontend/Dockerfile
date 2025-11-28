# Multi-stage build for React frontend
# Using Node.js 20 LTS (required by Vite 7, React Router 7, and @vitejs/plugin-react 5)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Accept build arguments for environment variables
ARG VITE_API_URL
ARG VITE_CHATBOT_URL

# Set environment variables for Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CHATBOT_URL=$VITE_CHATBOT_URL

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (npm install works with or without package-lock.json)
# Frontend needs dev dependencies for building
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
