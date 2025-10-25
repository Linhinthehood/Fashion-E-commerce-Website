import { API_ENDPOINTS } from './api';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Array<{ msg: string; param: string }>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      current: number;
      pages: number;
      total: number;
      limit: number;
    };
  };
}

// HTTP client configuration
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Create headers with auth token
const createHeaders = (includeAuth: boolean = true): HeadersInit => {
  const headers: HeadersInit = { ...DEFAULT_HEADERS };
  
  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Generic HTTP client
class ApiClient {
  constructor() {
    // Base URL is handled by individual API functions
  }

  private async request<T>(
    url: string,
    options: RequestInit = {},
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...createHeaders(includeAuth),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Request failed',
          error: data.error,
          errors: data.errors,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Network error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async get<T>(url: string, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'GET' }, includeAuth);
  }

  async post<T>(
    url: string,
    body?: any,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      url,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      includeAuth
    );
  }

  async put<T>(
    url: string,
    body?: any,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      url,
      {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      includeAuth
    );
  }

  async delete<T>(url: string, includeAuth: boolean = true): Promise<ApiResponse<T>> {
    return this.request<T>(url, { method: 'DELETE' }, includeAuth);
  }

  async patch<T>(
    url: string,
    body?: any,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      url,
      {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      },
      includeAuth
    );
  }
}

// Create API client instance
export const apiClient = new ApiClient();

// Auth API functions
export const authApi = {
  register: (userData: {
    name: string;
    email: string;
    password: string;
    dob: string;
    phoneNumber: string;
    gender: 'Male' | 'Female' | 'Others';
    role?: 'Manager' | 'Stock Clerk' | 'Customer';
  }) => apiClient.post(API_ENDPOINTS.auth.register(), userData, false),

  login: (credentials: { email: string; password: string }) =>
    apiClient.post(API_ENDPOINTS.auth.login(), credentials, false),

  getProfile: () => apiClient.get(API_ENDPOINTS.auth.profile()),

  updateProfile: (profileData: {
    name?: string;
    phoneNumber?: string;
    avatar?: string;
  }) => apiClient.put(API_ENDPOINTS.auth.updateProfile(), profileData),

  changePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => apiClient.put(API_ENDPOINTS.auth.changePassword(), passwordData),
};

// Customer API functions
export const customerApi = {
  getProfile: () => apiClient.get(API_ENDPOINTS.customers.profile()),

  updateProfile: (profileData: { addresses?: string[] }) =>
    apiClient.put(API_ENDPOINTS.customers.updateProfile(), profileData),

  updateLoyaltyPoints: (pointsData: {
    points: number;
    operation: 'add' | 'subtract' | 'set';
  }) => apiClient.put(API_ENDPOINTS.customers.loyaltyPoints(), pointsData),

  addAddress: (addressData: {
    name: string;
    addressInfo: string;
    isDefault?: boolean;
  }) => apiClient.post(API_ENDPOINTS.customers.addresses(), addressData),

  updateAddress: (addressId: string, addressData: {
    name?: string;
    addressInfo?: string;
    isDefault?: boolean;
  }) => apiClient.put(API_ENDPOINTS.customers.addressById(addressId), addressData),

  deleteAddress: (addressId: string) =>
    apiClient.delete(API_ENDPOINTS.customers.addressById(addressId)),
};

// Product API functions (Public - No authentication required)
export const productApi = {
  getProducts: (params?: {
    page?: number;
    limit?: number;
    categoryId?: string;
    brand?: string;
    gender?: string;
    color?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.products.list()}?${searchParams.toString()}`
      : API_ENDPOINTS.products.list();
    return apiClient.get(url, false); // No authentication required
  },

  getProduct: (id: string) => apiClient.get(API_ENDPOINTS.products.byId(id), false), // No auth

  searchProducts: (query: string, limit?: number) => {
    const searchParams = new URLSearchParams({ q: query });
    if (limit) searchParams.append('limit', limit.toString());
    return apiClient.get(`${API_ENDPOINTS.products.search()}?${searchParams.toString()}`, false); // No auth
  },

  getProductsByCategory: (categoryId: string) =>
    apiClient.get(API_ENDPOINTS.products.byCategory(categoryId), false), // No auth

  getProductsByBrand: (brand: string, limit?: number) => {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.append('limit', limit.toString());
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.products.byBrand(brand)}?${searchParams.toString()}`
      : API_ENDPOINTS.products.byBrand(brand);
    return apiClient.get(url, false); // No auth
  },

  getProductsByGender: (gender: string, limit?: number) => {
    const searchParams = new URLSearchParams();
    if (limit) searchParams.append('limit', limit.toString());
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.products.byGender(gender)}?${searchParams.toString()}`
      : API_ENDPOINTS.products.byGender(gender);
    return apiClient.get(url, false); // No auth
  },

  getProductStats: () => apiClient.get(API_ENDPOINTS.products.stats(), true), // Auth required for stats
};

// Category API functions (Public - No authentication required)
export const categoryApi = {
  getCategories: () => apiClient.get(API_ENDPOINTS.categories.list(), false), // No auth

  getCategory: (id: string) => apiClient.get(API_ENDPOINTS.categories.byId(id), false), // No auth

  getMasterCategories: () => apiClient.get(API_ENDPOINTS.categories.masterCategories(), false), // No auth

  getSubCategories: (masterCategory?: string) => {
    const searchParams = new URLSearchParams();
    if (masterCategory) searchParams.append('masterCategory', masterCategory);
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.categories.subCategories()}?${searchParams.toString()}`
      : API_ENDPOINTS.categories.subCategories();
    return apiClient.get(url, false); // No auth
  },

  getArticleTypes: (masterCategory?: string, subCategory?: string) => {
    const searchParams = new URLSearchParams();
    if (masterCategory) searchParams.append('masterCategory', masterCategory);
    if (subCategory) searchParams.append('subCategory', subCategory);
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.categories.articleTypes()}?${searchParams.toString()}`
      : API_ENDPOINTS.categories.articleTypes();
    return apiClient.get(url, false); // No auth
  },

  getCategoryStats: () => apiClient.get(API_ENDPOINTS.categories.stats(), true), // Auth required for stats

  getCategoryProducts: (id: string, params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.categories.products(id)}?${searchParams.toString()}`
      : API_ENDPOINTS.categories.products(id);
    return apiClient.get(url, false); // No auth
  },
};

// Variant API functions (Mixed - Some public, some require auth)
export const variantApi = {
  // Public endpoints (no auth required)
  getVariants: (params?: {
    page?: number;
    limit?: number;
    productId?: string;
    status?: string;
    size?: string;
    hasStock?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.variants.list()}?${searchParams.toString()}`
      : API_ENDPOINTS.variants.list();
    return apiClient.get(url, false); // No auth
  },

  getVariant: (id: string) => apiClient.get(API_ENDPOINTS.variants.byId(id), false), // No auth

  getAvailableVariants: () => apiClient.get(API_ENDPOINTS.variants.available(), false), // No auth

  getVariantsByProduct: (productId: string, status?: string) => {
    const searchParams = new URLSearchParams();
    if (status) searchParams.append('status', status);
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.variants.byProduct(productId)}?${searchParams.toString()}`
      : API_ENDPOINTS.variants.byProduct(productId);
    return apiClient.get(url, false); // No auth
  },

  getVariantsBySize: (size: string, status?: string) => {
    const searchParams = new URLSearchParams();
    if (status) searchParams.append('status', status);
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.variants.bySize(size)}?${searchParams.toString()}`
      : API_ENDPOINTS.variants.bySize(size);
    return apiClient.get(url, false); // No auth
  },

  // Admin/Staff endpoints (auth required)
  getLowStockVariants: (threshold?: number) => {
    const searchParams = new URLSearchParams();
    if (threshold) searchParams.append('threshold', threshold.toString());
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.variants.lowStock()}?${searchParams.toString()}`
      : API_ENDPOINTS.variants.lowStock();
    return apiClient.get(url, true); // Auth required
  },

  getOutOfStockVariants: () => apiClient.get(API_ENDPOINTS.variants.outOfStock(), true), // Auth required

  getVariantStats: () => apiClient.get(API_ENDPOINTS.variants.stats(), true), // Auth required

  updateStock: (id: string, quantity: number) =>
    apiClient.patch(API_ENDPOINTS.variants.updateStock(id), { quantity }, true), // Auth required

  reserveStock: (id: string, quantity: number) =>
    apiClient.patch(API_ENDPOINTS.variants.reserveStock(id), { quantity }, true), // Auth required

  releaseStock: (id: string, quantity: number) =>
    apiClient.patch(API_ENDPOINTS.variants.releaseStock(id), { quantity }, true), // Auth required
};

// Fashion API functions
export const fashionApi = {
  // Text-based search
  searchByText: (query: string, k: number = 6) => {
    const formData = new FormData();
    formData.append('query', query);
    formData.append('k', k.toString());
    return fetch(API_ENDPOINTS.fashion.searchText(), {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },

  // Get personalized recommendations
  getPersonalizedRecommendations: (userId: string, k: number = 10) => {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('k', k.toString());
    return fetch(API_ENDPOINTS.fashion.personalizedRecommendations(), {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },

  // Get similar products
  getSimilarProducts: (productId: string, k: number = 6) => {
    return fetch(`${API_ENDPOINTS.fashion.similarProducts(productId)}?k=${k}`, {
      method: 'POST',
    }).then(res => res.json());
  },

  // Get user recommendations
  getUserRecommendations: (userId: string, k: number = 10) => {
    return fetch(`${API_ENDPOINTS.fashion.userRecommendations(userId)}?k=${k}`, {
      method: 'POST',
    }).then(res => res.json());
  },

  // Track user interactions
  trackInteraction: (userId: string, productId: string, interactionType: string) => {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('product_id', productId);
    formData.append('interaction_type', interactionType);
    return fetch(API_ENDPOINTS.fashion.trackInteraction(), {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },

  // Get product details
  getProduct: (productId: string) => {
    return fetch(API_ENDPOINTS.fashion.getProduct(productId), {
      method: 'GET',
    }).then(res => res.json());
  },
};

// Health check function
export const healthCheck = () => apiClient.get('/health', false);

export default {
  authApi,
  customerApi,
  productApi,
  categoryApi,
  variantApi,
  fashionApi,
  healthCheck,
};
