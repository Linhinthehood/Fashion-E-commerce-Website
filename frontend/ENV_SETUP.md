# Environment Variables Setup Guide

## 📋 Overview

This guide explains how to set up environment variables for the Fashion Ecommerce frontend application.

## 🚀 Quick Start

1. **Copy the example file:**
   ```bash
   cp env.example .env
   ```

2. **Update the values** according to your environment

3. **Restart the development server:**
   ```bash
   npm run dev
   ```

## 🔧 Required Variables

### Core API Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Main API Gateway URL | `http://localhost:3000/api` | ✅ |
| `VITE_USER_SERVICE_URL` | Direct User Service URL | `http://localhost:3001/api` | ❌ |
| `VITE_PRODUCT_SERVICE_URL` | Direct Product Service URL | `http://localhost:3002/api` | ❌ |
| `VITE_ORDER_SERVICE_URL` | Direct Order Service URL | `http://localhost:3003/api` | ❌ |

## 🌍 Environment-Specific Configuration

### Development Environment

```bash
# .env.development
VITE_API_URL=http://localhost:3000/api
VITE_NODE_ENV=development
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_API_LOGGING=true
```

### Production Environment

```bash
# .env.production
VITE_API_URL=https://api.yourdomain.com/api
VITE_NODE_ENV=production
VITE_ENABLE_DEBUG_MODE=false
VITE_ENABLE_API_LOGGING=false
VITE_FORCE_HTTPS=true
```

## 📱 Feature Flags

Control application features using environment variables:

| Feature | Variable | Description |
|---------|----------|-------------|
| Analytics | `VITE_ENABLE_ANALYTICS` | Enable Google Analytics |
| PWA | `VITE_ENABLE_PWA` | Enable Progressive Web App |
| Debug Mode | `VITE_ENABLE_DEBUG_MODE` | Show debug information |
| API Logging | `VITE_ENABLE_API_LOGGING` | Log API requests/responses |
| Mock API | `VITE_USE_MOCK_API` | Use mock data instead of real API |

## 🔐 Authentication Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_AUTH_TOKEN_KEY` | localStorage key for auth token | `token` |
| `VITE_AUTH_USER_KEY` | localStorage key for user data | `user` |
| `VITE_SESSION_TIMEOUT` | Session timeout in minutes | `60` |

## 🎨 UI/UX Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_DEFAULT_PAGE_SIZE` | Default pagination size | `12` |
| `VITE_MAX_PAGE_SIZE` | Maximum pagination size | `100` |
| `VITE_DEFAULT_CURRENCY` | Default currency | `VND` |
| `VITE_DEFAULT_LOCALE` | Default locale | `vi-VN` |

## 🖼️ Image Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_MAX_IMAGE_SIZE` | Maximum image size in bytes | `5242880` (5MB) |
| `VITE_SUPPORTED_IMAGE_TYPES` | Supported image MIME types | `image/jpeg,image/png,image/webp` |

## 🔧 Development Tools

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_TIMEOUT` | API request timeout in ms | `10000` |
| `VITE_BUNDLE_ANALYZE` | Enable bundle analyzer | `false` |
| `VITE_GENERATE_SOURCEMAP` | Generate source maps | `false` |

## 🌐 External Services

### Google Analytics
```bash
VITE_ENABLE_ANALYTICS=true
VITE_GA_TRACKING_ID=GA_TRACKING_ID
```

### Sentry Error Tracking
```bash
VITE_SENTRY_DSN=https://your-sentry-dsn
```

### Cloudinary Image Upload
```bash
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

## 📦 Build Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_BUILD_DIR` | Build output directory | `dist` |
| `VITE_GENERATE_SOURCEMAP` | Generate source maps in production | `false` |

## 🔒 Security Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_FORCE_HTTPS` | Force HTTPS in production | `false` |
| `VITE_CSP_REPORT_URI` | Content Security Policy report URI | `` |

## 🚀 Performance Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_ENABLE_SERVICE_WORKER` | Enable service worker | `false` |
| `VITE_CACHE_DURATION` | Cache duration in ms | `3600000` (1 hour) |

## 📝 Usage in Code

### Accessing Environment Variables

```typescript
// In your React components
const apiUrl = import.meta.env.VITE_API_URL
const isDebugMode = import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true'
const pageSize = Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 12
```

### Type Safety

Create a type definition file for better TypeScript support:

```typescript
// src/types/env.d.ts
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_NODE_ENV: string
  readonly VITE_ENABLE_DEBUG_MODE: string
  // ... other variables
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## 🔄 Environment Switching

### Development
```bash
npm run dev
# Uses .env.development or .env
```

### Production Build
```bash
npm run build
# Uses .env.production or .env
```

### Custom Environment
```bash
NODE_ENV=staging npm run build
# Uses .env.staging or .env
```

## ⚠️ Important Notes

1. **Security**: Never commit `.env` files to version control
2. **Prefix**: All variables must start with `VITE_` to be accessible in the browser
3. **Restart**: Always restart the dev server after changing environment variables
4. **Types**: Environment variables are always strings, convert to numbers/booleans as needed

## 🐛 Troubleshooting

### Variables Not Loading
- Ensure variables start with `VITE_`
- Restart the development server
- Check for typos in variable names

### Build Issues
- Verify all required variables are set
- Check for missing quotes around values with spaces
- Ensure proper file encoding (UTF-8)

### Type Errors
- Add type definitions in `src/types/env.d.ts`
- Use proper type casting for non-string values

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [React Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [TypeScript Environment Variables](https://typescript-eslint.io/rules/no-unused-vars/)
