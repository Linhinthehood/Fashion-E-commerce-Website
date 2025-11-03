// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
/**
 * Build API URL with proper path handling
 * @param path - API path (with or without leading slash)
 * @param useGateway - Whether to use API Gateway (default: true)
 * @returns Complete API URL
 */
export function buildUrl(path: string, useGateway: boolean = true): string {
  const baseUrl = useGateway ? API_BASE_URL : '';
  const trimmed = path.startsWith('/') ? path : `/${path}`;
  
  // For gateway usage, remove /api prefix if present to avoid double /api
  if (useGateway && trimmed.startsWith('/api/')) {
    return `${baseUrl}${trimmed.slice(4)}`;
  }
  
  return `${baseUrl}${trimmed}`;
}

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // User Service (via Gateway)
  auth: {
    register: () => buildUrl('/auth/register'),
    login: () => buildUrl('/auth/login'),
    profile: () => buildUrl('/auth/profile'),
    updateProfile: () => buildUrl('/auth/profile'),
    changePassword: () => buildUrl('/auth/change-password'),
    google: () => buildUrl('/auth/google'),
    googleCallback: () => buildUrl('/auth/google/callback'),
    googleFailure: () => buildUrl('/auth/google/failure'),
  },
  customers: {
    profile: () => buildUrl('/customers/profile'),
    updateProfile: () => buildUrl('/customers/profile'),
    loyaltyPoints: () => buildUrl('/customers/loyalty-points'),
    addresses: () => buildUrl('/customers/addresses'),
    addressById: (id: string) => buildUrl(`/customers/addresses/${id}`),
    all: () => buildUrl('/customers/all'),
    byId: (customerId: string) => buildUrl(`/customers/${customerId}`),
  },
  // Product Service (via Gateway)
  products: {
    list: () => buildUrl('/products'),
    create: () => buildUrl('/products'),
    byId: (id: string) => buildUrl(`/products/${id}`),
    search: () => buildUrl('/products/search'),
    bySubCategory: (masterCategory: string, subCategory: string) => buildUrl(`/products/master/${masterCategory}/sub-category/${subCategory}`),
    byBrand: (brand: string) => buildUrl(`/products/brand/${brand}`),
    byGender: (gender: string) => buildUrl(`/products/gender/${gender}`),
    subCategoriesByMaster: (masterCategory: string) => buildUrl(`/products/master/${masterCategory}/sub-categories`),
    stats: () => buildUrl('/products/stats'),
    images: (productId: string) => buildUrl(`/products/${productId}/images`),
  },
  categories: {
    list: () => buildUrl('/categories'),
    byId: (id: string) => buildUrl(`/categories/${id}`),
    masterCategories: () => buildUrl('/categories/master-categories'),
    subCategories: () => buildUrl('/categories/sub-categories'),
    articleTypes: () => buildUrl('/categories/article-types'),
    stats: () => buildUrl('/categories/stats'),
    products: (id: string) => buildUrl(`/categories/${id}/products`),
  },
  variants: {
    list: () => buildUrl('/variants'),
    create: () => buildUrl('/variants'),
    byId: (id: string) => buildUrl(`/variants/${id}`),
    available: () => buildUrl('/variants/available'),
    lowStock: () => buildUrl('/variants/low-stock'),
    outOfStock: () => buildUrl('/variants/out-of-stock'),
    byProduct: (productId: string) => buildUrl(`/variants/product/${productId}`),
    bySize: (size: string) => buildUrl(`/variants/size/${size}`),
    stats: () => buildUrl('/variants/stats'),
    updateStock: (id: string) => buildUrl(`/variants/${id}/stock`),
    reserveStock: (id: string) => buildUrl(`/variants/${id}/reserve`),
    releaseStock: (id: string) => buildUrl(`/variants/${id}/release`),
  },
  // Order Service (via Gateway)
  orders: {
    create: () => buildUrl('/orders'),
    addItems: () => buildUrl('/orders/items'),
    myOrders: () => buildUrl('/orders/my-orders'), // POST with userId in body + query params
    stats: () => buildUrl('/orders/stats'), // POST with userId in body + query params
    byId: (id: string) => buildUrl(`/orders/${id}`),
    updatePaymentStatus: (id: string) => buildUrl(`/orders/${id}/payment-status`),
    updateShipmentStatus: (id: string) => buildUrl(`/orders/${id}/shipment-status`),
    applyDiscount: (id: string) => buildUrl(`/orders/${id}/discount`),
    adminAll: () => buildUrl('/orders'), // GET with query params
  },
  // Analytics endpoints
  analytics: {
    topProducts: () => buildUrl('/orders/analytics/top-products'),
    ordersStats: () => buildUrl('/orders/analytics/orders-stats'),
    topCustomers: () => buildUrl('/orders/analytics/top-customers'),
    overview: () => buildUrl('/orders/analytics/overview'),
  },
  // Fashion Service endpoints (proxied through API Gateway)
  fashion: {
    similar: () => buildUrl('/recommendations/similar'),
    productRecommendations: (productId: string) => buildUrl(`/recommendations/product/${productId}`),
    searchByImage: () => buildUrl('/recommendations/search-by-image'),
    stats: () => buildUrl('/recommendations/stats'),
    batch: () => buildUrl('/recommendations/batch'),
    retrievePersonalized: () => buildUrl('/recommendations/retrieve/personalized'),
  },
  // Events (via Gateway -> order-service)
  events: {
    batch: () => buildUrl('/events/batch'),
    metrics: () => buildUrl('/events/metrics'),
    topViewed: () => buildUrl('/events/aggregates/top-viewed'),
    popularity: () => buildUrl('/events/aggregates/popularity'),
    affinity: () => buildUrl('/events/aggregates/affinity'),
  },
} as const;

// Auth API functions - use apiService.ts instead
export { authApi as authAPI } from './apiService';


