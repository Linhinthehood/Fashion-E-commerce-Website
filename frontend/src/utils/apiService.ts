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
      const headers = new Headers(createHeaders(includeAuth));

      if (options.headers) {
        const customHeaders = new Headers(options.headers);
        customHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      }

      if (options.body instanceof FormData) {
        headers.delete('Content-Type');
      }

      const response = await fetch(url, {
        ...options,
        headers,
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

  async postFormData<T>(
    url: string,
    formData: FormData,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      url,
      {
        method: 'POST',
        body: formData,
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

  async putFormData<T>(
    url: string,
    formData: FormData,
    includeAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      url,
      {
        method: 'PUT',
        body: formData,
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
    dob?: string;
    phoneNumber?: string;
    gender?: 'Male' | 'Female' | 'Others';
    role?: 'Manager' | 'Stock Clerk' | 'Customer';
  }) => apiClient.post(API_ENDPOINTS.auth.register(), userData, false),

  login: (credentials: { email: string; password: string }) =>
    apiClient.post(API_ENDPOINTS.auth.login(), credentials, false),

  getProfile: () => apiClient.get(API_ENDPOINTS.auth.profile()),

  updateProfile: (profileData: {
    name?: string;
    phoneNumber?: string;
    avatar?: string;
    dob?: string;
    gender?: 'Male' | 'Female' | 'Others';
  }) => apiClient.put(API_ENDPOINTS.auth.updateProfile(), profileData),

  changePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => apiClient.put(API_ENDPOINTS.auth.changePassword(), passwordData),

  // Google OAuth functions
  googleLogin: () => {
    // Redirect to Google OAuth (not an API call)
    window.location.href = API_ENDPOINTS.auth.google();
  },

  googleCallback: () => {
    // This is handled by the backend redirect, not a direct API call
    return API_ENDPOINTS.auth.googleCallback();
  },

  googleFailure: () => {
    // This is handled by the backend redirect, not a direct API call
    return API_ENDPOINTS.auth.googleFailure();
  },
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

  getAllCustomers: (params?: {
    page?: number
    limit?: number
    city?: string
    district?: string
    status?: 'active' | 'inactive'
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    const url = searchParams.toString()
      ? `${API_ENDPOINTS.customers.all()}?${searchParams.toString()}`
      : API_ENDPOINTS.customers.all()

    return apiClient.get(url, true)
  },

  getCustomerById: (customerId: string) =>
    apiClient.get(API_ENDPOINTS.customers.byId(customerId), true)
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

  createProduct: (productData: FormData) =>
    apiClient.postFormData(API_ENDPOINTS.products.create(), productData, true),

  updateProduct: (id: string, formData: FormData) =>
    apiClient.putFormData(API_ENDPOINTS.products.byId(id), formData, true),

  deleteProduct: (id: string) => apiClient.delete(API_ENDPOINTS.products.byId(id), true),

  searchProducts: (query: string, limit?: number) => {
    const searchParams = new URLSearchParams({ q: query });
    if (limit) searchParams.append('limit', limit.toString());
    return apiClient.get(`${API_ENDPOINTS.products.search()}?${searchParams.toString()}`, false); // No auth
  },

  uploadProductImages: (productId: string, formData: FormData) =>
    apiClient.postFormData(API_ENDPOINTS.products.images(productId), formData, true),

  deleteProductImage: (productId: string, imageUrl: string) =>
    apiClient.delete(`${API_ENDPOINTS.products.images(productId)}/${encodeURIComponent(imageUrl)}`, true),

  getProductsBySubCategory: (masterCategory: string, subCategory: string, params?: {
    page?: number;
    limit?: number;
    brand?: string;
    gender?: string;
    color?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
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
      ? `${API_ENDPOINTS.products.bySubCategory(masterCategory, subCategory)}?${searchParams.toString()}`
      : API_ENDPOINTS.products.bySubCategory(masterCategory, subCategory);
    return apiClient.get(url, false); // No auth
  },

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

  getSubCategoriesByMaster: (masterCategory: string) =>
    apiClient.get(API_ENDPOINTS.products.subCategoriesByMaster(masterCategory), false), // No auth
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
  createVariant: (payload: {
    productId: string;
    size: string;
    stock: number;
    status?: 'Active' | 'Inactive';
    price?: number;
  }) => apiClient.post(API_ENDPOINTS.variants.create(), payload, true),

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

// Order API functions (Mixed: some POST with userId in body per backend contract)
export const orderApi = {
  // Create order step 1
  createOrder: (payload: {
    userId: string;
    addressId: string;
    paymentMethod: 'COD' | 'Momo' | 'Bank';
  }) => apiClient.post(API_ENDPOINTS.orders.create(), payload, true),

  // Create order step 2: add items
  addItems: (payload: {
    orderId: string;
    items: Array<{ productId: string; variantId: string; quantity: number }>;
  }) => apiClient.post(API_ENDPOINTS.orders.addItems(), payload, true),

  // Customer: get my orders (backend expects userId in body, filters in query)
  getMyOrders: (body: { userId: string }, params?: {
    page?: number;
    limit?: number;
    paymentStatus?: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
    shipmentStatus?: 'Pending' | 'Packed' | 'Delivered' | 'Returned';
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.orders.myOrders()}?${searchParams.toString()}`
      : API_ENDPOINTS.orders.myOrders();
    return apiClient.post(url, body, true);
  },

  // Customer: get order stats
  getMyStats: (body: { userId: string }, params?: { startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.orders.stats()}?${searchParams.toString()}`
      : API_ENDPOINTS.orders.stats();
    return apiClient.post(url, body, true);
  },

  // Get order by id
  getById: (id: string) => apiClient.get(API_ENDPOINTS.orders.byId(id), true),

  // Admin: get all orders with filters
  adminGetAll: (params?: {
    page?: number;
    limit?: number;
    paymentStatus?: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
    shipmentStatus?: 'Pending' | 'Packed' | 'Delivered' | 'Returned';
    startDate?: string;
    endDate?: string;
    sortBy?: 'createdAt' | 'finalPrice' | 'paymentStatus' | 'shipmentStatus';
    sortOrder?: 'asc' | 'desc';
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.orders.adminAll()}?${searchParams.toString()}`
      : API_ENDPOINTS.orders.adminAll();
    return apiClient.get(url, true);
  },

  // Admin: update payment status
  updatePaymentStatus: (
    id: string,
    body: { status: 'Pending' | 'Paid' | 'Failed' | 'Refunded' }
  ) => apiClient.put(API_ENDPOINTS.orders.updatePaymentStatus(id), body, true),

  // Admin: update shipment status
  updateShipmentStatus: (
    id: string,
    body: { status: 'Pending' | 'Packed' | 'Delivered' | 'Returned' }
  ) => apiClient.put(API_ENDPOINTS.orders.updateShipmentStatus(id), body, true),

  // Admin: apply discount
  applyDiscount: (id: string, body: { discount: number }) =>
    apiClient.put(API_ENDPOINTS.orders.applyDiscount(id), body, true),
};

// Analytics API functions
export const analyticsApi = {
  // Get top products
  getTopProducts: (params?: {
    period?: 'day' | 'month' | 'year' | 'all';
    date?: string; // YYYY-MM-DD for day, YYYY-MM for month, YYYY for year
    limit?: number;
    sortBy?: 'quantity' | 'revenue';
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.analytics.topProducts()}?${searchParams.toString()}`
      : API_ENDPOINTS.analytics.topProducts();
    return apiClient.get(url, true);
  },

  // Get orders statistics
  getOrdersStats: (params?: {
    period?: 'day' | 'month' | 'year' | 'all';
    date?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.analytics.ordersStats()}?${searchParams.toString()}`
      : API_ENDPOINTS.analytics.ordersStats();
    return apiClient.get(url, true);
  },

  // Get top customers
  getTopCustomers: (params?: {
    period?: 'day' | 'month' | 'year' | 'all';
    date?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.analytics.topCustomers()}?${searchParams.toString()}`
      : API_ENDPOINTS.analytics.topCustomers();
    return apiClient.get(url, true);
  },

  // Get dashboard overview (all metrics in one call)
  getOverview: (params?: {
    period?: 'day' | 'month' | 'year' | 'all';
    date?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const url = searchParams.toString()
      ? `${API_ENDPOINTS.analytics.overview()}?${searchParams.toString()}`
      : API_ENDPOINTS.analytics.overview();
    return apiClient.get(url, true);
  },
};
// Helpers for Fashion API local history
const FASHION_HISTORY_PREFIX = 'fashion_recent_products_';

const persistInteraction = (userId: string, productId: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const storageKey = `${FASHION_HISTORY_PREFIX}${userId}`;
    const rawHistory = window.localStorage.getItem(storageKey);
    const history: string[] = rawHistory ? JSON.parse(rawHistory) : [];

    const nextHistory = [productId, ...history.filter((id) => id !== productId)];
    window.localStorage.setItem(storageKey, JSON.stringify(nextHistory.slice(0, 10)));
  } catch (error) {
    console.warn('[fashionApi] Failed to persist interaction', error);
  }
};

const getRecentProductId = (userId: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storageKey = `${FASHION_HISTORY_PREFIX}${userId}`;
    const rawHistory = window.localStorage.getItem(storageKey);
    const history: string[] = rawHistory ? JSON.parse(rawHistory) : [];
    return history.length > 0 ? history[0] : null;
  } catch (error) {
    console.warn('[fashionApi] Failed to read interaction history', error);
    return null;
  }
};

const handleJsonResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      message: data?.message || data?.error || 'Fashion service request failed',
      error: data?.error,
      data,
    };
  }

  return {
    success: true,
    data,
  };
};

const fetchSimilarProducts = async (
  productId: string,
  params?: { limit?: number; sameCategoryOnly?: boolean; minSimilarity?: number }
) => {
  // Build the base URL string
  let urlString = API_ENDPOINTS.fashion.productRecommendations(productId);
  
  // Add query parameters if provided
  const queryParams = new URLSearchParams();
  
  if (params?.limit) {
    queryParams.set('limit', params.limit.toString());
  }

  if (params?.sameCategoryOnly !== undefined) {
    queryParams.set('sameCategoryOnly', params.sameCategoryOnly ? 'true' : 'false');
  }

  if (params?.minSimilarity !== undefined) {
    queryParams.set('minSimilarity', params.minSimilarity.toString());
  }

  // Append query string if there are parameters
  const queryString = queryParams.toString();
  if (queryString) {
    urlString += `?${queryString}`;
  }

  const response = await fetch(urlString, {
    method: 'GET',
  });

  return handleJsonResponse(response);
};

// Fashion API functions
export const fashionApi = {
  // Fetch recommendations for a given product (GET)
  getSimilarProducts: fetchSimilarProducts,

  // Request similar products with custom options (POST)
  findSimilarProducts: async (payload: {
    productId: string;
    limit?: number;
    options?: Record<string, unknown>;
  }) => {
    const response = await fetch(API_ENDPOINTS.fashion.similar(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleJsonResponse(response);
  },

  // Search similar products by image URL
  searchByImage: async (payload: {
    imageUrl: string;
    limit?: number;
    options?: Record<string, unknown>;
  }) => {
    const response = await fetch(API_ENDPOINTS.fashion.searchByImage(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleJsonResponse(response);
  },

  // Batch recommendations for multiple products
  getBatchRecommendations: async (payload: {
    productIds: string[];
    limit?: number;
  }) => {
    const response = await fetch(API_ENDPOINTS.fashion.batch(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return handleJsonResponse(response);
  },

  // Fetch service statistics
  getStats: async () => {
    const response = await fetch(API_ENDPOINTS.fashion.stats(), {
      method: 'GET',
    });

    return handleJsonResponse(response);
  },

  // Get user-tailored recommendations based on recent interactions stored locally
  getUserRecommendations: async (userId: string, limit: number = 8) => {
    const recentProductId = getRecentProductId(userId);

    if (!recentProductId) {
      return {
        success: false,
        message: 'Chưa có dữ liệu tương tác để gợi ý',
      };
    }

    const similarResponse = await fetchSimilarProducts(recentProductId, { limit });

    if (!similarResponse.success || !similarResponse.data) {
      return {
        success: false,
        message: similarResponse.message || 'Không lấy được gợi ý',
      };
    }

    const recommendations = Array.isArray(similarResponse.data.recommendations)
      ? similarResponse.data.recommendations.map((item: any) => ({
          ...item.product,
          similarity: item.similarity,
        }))
      : [];

    return {
      success: true,
      data: recommendations,
    };
  },

  // Track user interaction locally (future: send to backend when endpoint available)
  trackInteraction: async (userId: string, productId: string, interactionType: string) => {
    persistInteraction(userId, productId);

    return {
      success: true,
      message: `Tracked ${interactionType}`,
    };
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
  orderApi,
  fashionApi,
  healthCheck,
};
