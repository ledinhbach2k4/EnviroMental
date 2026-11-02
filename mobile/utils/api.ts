import axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { Alert } from 'react-native';
import { ENV } from '../constants/api';

const API_BASE_URL = ENV.API_URL;

// --- CONFIGURATION CONSTANTS ---
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 8000;
const RATE_LIMIT_ALERT_COOLDOWN_MS = 10000;

let lastAlertTime = 0;

/**
 * Surface a debounced, user-friendly alert when 429 retries are completely exhausted.
 * Minimum 10s cooldown prevents alert stacking when multiple requests fail concurrently.
 */
function showRateLimitAlert() {
  const now = Date.now();
  if (now - lastAlertTime > RATE_LIMIT_ALERT_COOLDOWN_MS) {
    lastAlertTime = now;
    if (typeof Alert !== 'undefined' && Alert?.alert) {
      Alert.alert(
        'Server Busy',
        'The server is experiencing high traffic. Please wait a moment and try again.',
        [{ text: 'OK' }]
      );
    }
  }
}

/**
 * Asynchronous pause helper for backoff delays
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- REQUEST DEDUPLICATOR (FAILSAFE) ---
// Prevents duplicate GET requests to the same URL within a 5-second window
interface PendingRequest {
  promise: Promise<AxiosResponse>;
  timestamp: number;
  resolve: (value: AxiosResponse) => void;
  reject: (reason: unknown) => void;
}

const pendingRequests = new Map<string, PendingRequest>();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Extend Axios config type for deduplication & retry metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
  __deduplicationKey?: string;
  __deduplicationResolve?: (value: AxiosResponse) => void;
  __deduplicationReject?: (reason: unknown) => void;
}

// Request deduplication interceptor
api.interceptors.request.use((config: ExtendedAxiosRequestConfig) => {
  // If this is a rate limit retry attempt, bypass deduplication checks
  if (config.__retryCount && config.__retryCount > 0) {
    return config;
  }

  // Only deduplicate GET requests
  if (config.method?.toLowerCase() !== 'get') {
    return config;
  }

  const cacheKey = `${config.url}?${JSON.stringify(config.params || {})}`;
  const now = Date.now();

  // Check if there's an in-flight request for the same URL
  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    const elapsed = now - pending.timestamp;
    if (elapsed < 5000) {
      // 5-second deduplication window
      console.log(`[API Deduplicator] Returning cached promise for: ${cacheKey}`);
      // Reject current request with deduplication marker so response interceptor can return existing promise
      return Promise.reject({ __deduplicated: true, promise: pending.promise });
    }
  }

  // Create a new promise wrapper to track this request
  let resolveFn!: (value: AxiosResponse) => void;
  let rejectFn!: (reason: unknown) => void;
  const promise = new Promise<AxiosResponse>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  pendingRequests.set(cacheKey, {
    promise,
    timestamp: now,
    resolve: resolveFn,
    reject: rejectFn,
  });

  config.__deduplicationKey = cacheKey;
  config.__deduplicationResolve = resolveFn;
  config.__deduplicationReject = rejectFn;

  return config;
});

// Response interceptor to handle deduplication cache and 429 exponential backoff retries
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
  async (error: unknown) => {
    // If request was short-circuited by our deduplicator, return the pending promise directly
    if (error && typeof error === 'object' && '__deduplicated' in error) {
      const deduplicated = error as { __deduplicated: boolean; promise: Promise<AxiosResponse> };
      if (deduplicated.__deduplicated && deduplicated.promise) {
        return deduplicated.promise;
      }
    }

    if (axios.isAxiosError(error)) {
      const config = error.config as ExtendedAxiosRequestConfig | undefined;

      // --- 429 RATE LIMIT RETRY MECHANISM ---
      if (error.response?.status === 429 && config) {
        const currentRetries = config.__retryCount || 0;

        if (currentRetries < MAX_RETRIES) {
          config.__retryCount = currentRetries + 1;

          // Exponential backoff: 1s, 2s, 4s + random jitter
          let delay = INITIAL_BACKOFF_MS * Math.pow(2, currentRetries);
          const jitter = Math.floor(Math.random() * 250);
          delay = Math.min(delay + jitter, MAX_BACKOFF_MS);

          // Respect standard Retry-After header (in seconds) if provided by server
          const retryAfterHeader =
            error.response.headers?.['retry-after'] || error.response.headers?.['Retry-After'];
          if (retryAfterHeader) {
            const parsedSeconds = parseInt(String(retryAfterHeader), 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              delay = Math.min(parsedSeconds * 1000, MAX_BACKOFF_MS);
            }
          }

          console.warn(
            `[API RateLimit] 429 received for ${config.url || 'request'}. Retrying attempt ${
              config.__retryCount
            }/${MAX_RETRIES} in ${Math.round(delay)}ms...`
          );

          await sleep(delay);

          // Silent retry
          return api(config);
        }

        // Exhausted retries for 429
        console.error(
          `[API RateLimit] Rate limit retries exhausted (${MAX_RETRIES}) for ${
            config.url || 'request'
          }.`
        );
        showRateLimitAlert();
      }

      // Cleanup deduplication state on failure (either non-429 or retries exhausted)
      const key = config?.__deduplicationKey;
      if (key) {
        const pending = pendingRequests.get(key);
        if (pending?.reject) {
          pending.reject(error);
        }
        pendingRequests.delete(key);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
