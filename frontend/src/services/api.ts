import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Network error recovery and retry logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;

    // Check if we're offline
    if (!navigator.onLine) {
      toast.error('You are offline. Please check your internet connection.', {
        duration: 5000,
        icon: '📡',
      });
      return Promise.reject(error);
    }

    // Check for network timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      toast.error('Request timed out. Please try again.', {
        duration: 4000,
        icon: '⏱️',
      });
      return Promise.reject(error);
    }

    // Retry logic for network errors (but not for 4xx/5xx responses)
    if (!error.response && config && !(config as any)._retry) {
      (config as any)._retry = true;
      (config as any)._retryCount = ((config as any)._retryCount || 0) + 1;

      // Retry up to 2 times with exponential backoff
      if ((config as any)._retryCount <= 2) {
        const delay = Math.pow(2, (config as any)._retryCount) * 1000; // 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));

        toast.loading('Retrying...', {
          duration: 1000,
          icon: '🔄',
        });

        return api(config);
      } else {
        toast.error('Network error. Please check your connection and try again.', {
          duration: 5000,
          icon: '❌',
        });
      }
    }

    // Handle 401 Unauthorized - logout user
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      // Only show toast if not on login/register pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        toast.error('Session expired. Please log in again.', {
          duration: 4000,
          icon: '🔒',
        });
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    }

    return Promise.reject(error);
  }
);

// Detect online/offline status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    toast.success('Back online!', {
      duration: 3000,
      icon: '✅',
    });
  });

  window.addEventListener('offline', () => {
    toast.error('You are now offline', {
      duration: 5000,
      icon: '📡',
    });
  });
}

// Product API
export const productAPI = {
  getAll: async () => {
    const response = await api.get('/products');
    return response.data.data.products;
  },

  getBySlug: async (slug: string) => {
    const response = await api.get(`/products/${slug}`);
    return response.data.data;
  },
};

// Price API
export const priceAPI = {
  calculate: async (quoteData: any) => {
    const response = await api.post('/price/quote', quoteData);
    return response.data.data;
  },
};

// Order API
export const orderAPI = {
  create: async (orderData: any) => {
    const response = await api.post('/orders/create', orderData);
    return response.data.data;
  },

  get: async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return response.data.data;
  },

  capturePayment: async (orderId: string, paymentIntentId: string) => {
    const response = await api.post(`/orders/${orderId}/capture-payment`, {
      payment_intent_id: paymentIntentId,
    });
    return response.data.data;
  },
};

// Track in-flight uploads to prevent duplicates
const inFlightUploads = new Map<string, Promise<any>>();

// Upload API
export const uploadAPI = {
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/uploads/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.asset;
  },

  uploadShirtPhoto: async (file: File) => {
    // Generate unique key for this file
    const uploadKey = `${file.name}-${file.size}-${file.lastModified}`;

    // If this exact file is already uploading, return the existing promise
    if (inFlightUploads.has(uploadKey)) {
      if (import.meta.env.DEV) console.log('Upload already in progress, returning existing promise');
      return inFlightUploads.get(uploadKey)!;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Create upload promise immediately and set it in the map to prevent race condition
    const uploadPromise = (async () => {
      try {
        const response = await api.post('/uploads/shirt-photo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 seconds for shirt photo upload
        });
        return response.data.data;
      } finally {
        // Remove from in-flight map after completion or error
        inFlightUploads.delete(uploadKey);
      }
    })();

    // Track this upload IMMEDIATELY to prevent race condition
    inFlightUploads.set(uploadKey, uploadPromise);

    return uploadPromise;
  },
};

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data.data;
    localStorage.setItem('auth_token', token);
    return { token, user };
  },

  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data.data.user;
  },

  oauthSync: async (email: string, name: string, supabaseId: string) => {
    const response = await api.post('/auth/oauth/sync', { email, name, supabaseId });
    const { token, user } = response.data.data;
    localStorage.setItem('auth_token', token);
    return { token, user };
  },

  me: async () => {
    const response = await api.get('/auth/me');
    return response.data.data.user;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
  },
};

// Design API
export const designAPI = {
  save: async (designData: any) => {
    const response = await api.post('/designs', designData);
    return response.data.data.design;
  },

  getAll: async () => {
    const response = await api.get('/designs');
    return response.data.data.designs;
  },

  getById: async (id: string) => {
    const response = await api.get(`/designs/${id}`);
    return response.data.data.design;
  },

  update: async (id: string, designData: any) => {
    const response = await api.put(`/designs/${id}`, designData);
    return response.data.data.design;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/designs/${id}`);
    return response.data.data;
  },
};

// Job API
export const jobAPI = {
  getStatus: async (jobId: string) => {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data.job;
  },
};

// Admin API (requires admin authentication)
export const adminAPI = {
  // Get all orders with complete details
  getAllOrders: async (filters?: { payment_status?: string; production_status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.payment_status) params.append('payment_status', filters.payment_status);
    if (filters?.production_status) params.append('production_status', filters.production_status);

    const queryString = params.toString();
    const url = `/admin/orders${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return response.data.data.orders;
  },

  // Get single order by ID with full details
  getOrderById: async (orderId: string) => {
    const response = await api.get(`/admin/orders/${orderId}`);
    return response.data.data.order;
  },

  // Update order production status
  updateOrderStatus: async (
    orderId: string,
    status: string,
    options?: {
      tracking_number?: string;
      carrier?: string;
      internal_notes?: string;
    }
  ) => {
    const response = await api.patch(`/admin/orders/${orderId}/status`, {
      status,
      ...options,
    });
    return response.data.data.order;
  },

  // Convenience method to add tracking number
  addTrackingNumber: async (
    orderId: string,
    trackingNumber: string,
    carrier?: string
  ) => {
    const response = await api.patch(`/admin/orders/${orderId}/status`, {
      status: 'shipped',
      tracking_number: trackingNumber,
      carrier: carrier || 'USPS',
    });
    return response.data.data.order;
  },
};

export default api;
