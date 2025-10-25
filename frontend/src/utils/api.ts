// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Service-specific base URLs for direct access (if needed)
export const USER_SERVICE_URL = import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:3001/api';
export const PRODUCT_SERVICE_URL = import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:3002/api';
export const ORDER_SERVICE_URL = import.meta.env.VITE_ORDER_SERVICE_URL || 'http://localhost:3003/api';
export const FASHION_SERVICE_URL = import.meta.env.VITE_FASHION_SERVICE_URL || 'http://localhost:8000';

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
 * Build service-specific URLs
 */
export const buildUserApiUrl = (path: string) => buildUrl(path, false).replace(API_BASE_URL, USER_SERVICE_URL);
export const buildProductApiUrl = (path: string) => buildUrl(path, false).replace(API_BASE_URL, PRODUCT_SERVICE_URL);
export const buildOrderApiUrl = (path: string) => buildUrl(path, false).replace(API_BASE_URL, ORDER_SERVICE_URL);

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
  },
  customers: {
    profile: () => buildUrl('/customers/profile'),
    updateProfile: () => buildUrl('/customers/profile'),
    loyaltyPoints: () => buildUrl('/customers/loyalty-points'),
    addresses: () => buildUrl('/customers/addresses'),
    addressById: (id: string) => buildUrl(`/customers/addresses/${id}`),
  },
  // Product Service (via Gateway)
  products: {
    list: () => buildUrl('/products'),
    byId: (id: string) => buildUrl(`/products/${id}`),
    search: () => buildUrl('/products/search'),
    byCategory: (categoryId: string) => buildUrl(`/products/category/${categoryId}`),
    byBrand: (brand: string) => buildUrl(`/products/brand/${brand}`),
    byGender: (gender: string) => buildUrl(`/products/gender/${gender}`),
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
    list: () => buildUrl('/orders'),
    byId: (id: string) => buildUrl(`/orders/${id}`),
    create: () => buildUrl('/orders'),
    update: (id: string) => buildUrl(`/orders/${id}`),
    cancel: (id: string) => buildUrl(`/orders/${id}/cancel`),
  },
  cart: {
    get: () => buildUrl('/cart'),
    addItem: () => buildUrl('/cart/items'),
    updateItem: (itemId: string) => buildUrl(`/cart/items/${itemId}`),
    removeItem: (itemId: string) => buildUrl(`/cart/items/${itemId}`),
    clear: () => buildUrl('/cart/clear'),
  },
  // Fashion Service endpoints
  fashion: {
    searchText: () => `${FASHION_SERVICE_URL}/api/v1/search/text`,
    personalizedRecommendations: () => `${FASHION_SERVICE_URL}/api/v1/recommendations/personalized`,
    similarProducts: (productId: string) => `${FASHION_SERVICE_URL}/api/v1/recommendations/product/${productId}`,
    userRecommendations: (userId: string) => `${FASHION_SERVICE_URL}/api/v1/recommendations/user/${userId}`,
    trackInteraction: () => `${FASHION_SERVICE_URL}/api/v1/track/interaction`,
    getProduct: (productId: string) => `${FASHION_SERVICE_URL}/api/v1/products/${productId}`,
  },
} as const;

export const authAPI = {
  register: async (userData: {
    name: string
    email: string
    password: string
    phoneNumber?: string
    dob?: string
    gender?: string
    role?: string
  }) => {
    try {
      // Remove the extra /api since USER_SERVICE_URL already includes it
      const response = await fetch(`${USER_SERVICE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data
          }
        }
      }

      return data
    } catch (error) {
      console.error('Register API Error:', error)
      throw error
    }
  },

  login: async (email: string, password: string) => {
    try {
      // Remove the extra /api since USER_SERVICE_URL already includes it
      const response = await fetch(`${USER_SERVICE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data
          }
        }
      }

      return data
    } catch (error) {
      console.error('Login API Error:', error)
      throw error
    }
  },

  getProfile: async () => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        throw new Error('No token found')
      }

      const response = await fetch(`${USER_SERVICE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data
          }
        }
      }

      return data
    } catch (error) {
      console.error('Get Profile API Error:', error)
      throw error
    }
  }
}


