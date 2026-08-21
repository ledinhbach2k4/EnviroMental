import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// --- NETWORK CONNECTION FIX ---
// Issue: The mobile app (on an emulator/device) cannot connect to `localhost`.
// Solution: Use the local IP address of the machine running the backend server.
// Replace '192.168.1.10' with your IP address if it changes.
const API_BASE_URL = 'https://enviromental-app-api.onrender.com/api';

// --- REQUEST DEDUPLICATOR (FAILSAFE) ---
// Prevents duplicate GET requests to the same URL within a 5-second window
interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

const pendingRequests = new Map<string, PendingRequest>();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Extend Axios config type for deduplication metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  __deduplicationKey?: string;
  __deduplicationResolve?: (value: any) => void;
  __deduplicationReject?: (reason: any) => void;
}

// Request deduplication interceptor
api.interceptors.request.use((config: ExtendedAxiosRequestConfig) => {
  // Only deduplicate GET requests
  if (config.method?.toLowerCase() !== 'get') {
    return config;
  }

  const cacheKey = `${config.url}?${JSON.stringify(config.params || {})}`;
  const now = Date.now();

  // Check if there's a pending request for the same URL
  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    const elapsed = now - pending.timestamp;
    if (elapsed < 5000) { // 5-second deduplication window
      console.log(`[API Deduplicator] Returning cached promise for: ${cacheKey}`);
      // Reject current request with deduplication marker
      return Promise.reject({ __deduplicated: true, promise: pending.promise });
    }
  }

  // Create a new promise wrapper to track this request
  let resolveFn: (value: any) => void;
  let rejectFn: (reason: any) => void;
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  pendingRequests.set(cacheKey, {
    promise,
    timestamp: now,
    resolve: resolveFn!,
    reject: rejectFn!,
  });

  config.__deduplicationKey = cacheKey;
  config.__deduplicationResolve = resolveFn!;
  config.__deduplicationReject = rejectFn!;

  return config;
});

// Response interceptor to clean up deduplication cache
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config as ExtendedAxiosRequestConfig;
    const key = config?.__deduplicationKey;
    if (key) {
      const pending = pendingRequests.get(key);
      if (pending?.resolve) {
        pending.resolve(response);
      }
      pendingRequests.delete(key);
    }
    return response;
  },
  (error) => {
    const config = error.config as ExtendedAxiosRequestConfig;
    const key = config?.__deduplicationKey;
    if (key) {
      const pending = pendingRequests.get(key);
      if (pending?.reject) {
        pending.reject(error);
      }
      pendingRequests.delete(key);
    }
    return Promise.reject(error);
  }
);

export default api;