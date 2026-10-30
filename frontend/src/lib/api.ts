import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status?: number;

  constructor(payload: ApiErrorPayload, status?: number) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.details = payload.details;
    this.status = status;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// --- CSRF Token Management ---
let memoryCsrfToken: string | null = null;
let csrfFetchPromise: Promise<string> | null = null;

/**
 * Retrieves the anti-CSRF token, preferring cookie or memory cache,
 * and fetching from /auth/csrf-token if missing or forced.
 */
export async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (memoryCsrfToken && !forceRefresh) {
    return memoryCsrfToken;
  }

  // Check document cookie if running client-side
  if (typeof document !== 'undefined' && !forceRefresh) {
    const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
    if (match && match[1]) {
      memoryCsrfToken = decodeURIComponent(match[1]);
      return memoryCsrfToken;
    }
  }

  if (csrfFetchPromise && !forceRefresh) {
    return csrfFetchPromise;
  }

  csrfFetchPromise = axios
    .get<{ csrfToken: string }>(`${BASE_URL}/auth/csrf-token`, {
      withCredentials: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
    .then((res) => {
      const token = res.data.csrfToken;
      memoryCsrfToken = token;
      csrfFetchPromise = null;
      return token;
    })
    .catch((err) => {
      csrfFetchPromise = null;
      throw err;
    });

  return csrfFetchPromise;
}

export function setMemoryCsrfToken(token: string | null): void {
  memoryCsrfToken = token;
}

// --- Request Queue for 401 Refresh Handling ---
interface QueuedRequest {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// --- Session Expired Event Emitter for UI Modals ---
type SessionExpiredListener = () => void;
const sessionExpiredListeners: Set<SessionExpiredListener> = new Set();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  sessionExpiredListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });

  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (currentPath !== '/login' && !currentPath.startsWith('/login')) {
      window.location.href = `/login?expired=true&redirect=${encodeURIComponent(currentPath)}`;
    }
  }
}

// --- Custom Request Config with retry flags ---
interface CustomInternalRequestConfig extends InternalAxiosRequestConfig {
  _isRetry?: boolean;
  _isCsrfRetry?: boolean;
}

// --- Request Interceptor: Attach CSRF and headers ---
api.interceptors.request.use(
  async (config: CustomInternalRequestConfig) => {
    const method = config.method?.toUpperCase();
    const isStateChanging = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    config.headers['X-Requested-With'] = 'XMLHttpRequest';

    // If request changes state and is not exempt, attach CSRF token
    if (isStateChanging) {
      try {
        const token = await getCsrfToken();
        if (token) {
          config.headers['X-CSRF-Token'] = token;
        }
      } catch {
        // Fall back to attempting request with X-Requested-With header
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// --- Normalizes all HTTP/network errors to { code, message, details } ---
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  const axiosErr = error as AxiosError<{
    error?: { code?: string; message?: string; details?: unknown };
    message?: string;
  }>;

  // 1. Client offline or network failure
  if (!axiosErr.response) {
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    return new ApiError(
      {
        code: isOffline ? 'OFFLINE' : 'NETWORK_ERROR',
        message: isOffline
          ? 'You are currently offline. Please check your internet connection.'
          : 'Unable to connect to the farm server. Please check your network connection.',
      },
      0
    );
  }

  const status = axiosErr.response.status;
  const data = axiosErr.response.data;

  // 2. 429 Rate Limiting
  if (status === 429) {
    const retryAfter = axiosErr.response.headers?.['retry-after'];
    const retryMessage = retryAfter
      ? `Too many requests. Please wait ${retryAfter} second(s) before trying again.`
      : 'Too many requests. Please slow down and try again shortly.';

    return new ApiError(
      {
        code: data?.error?.code || 'RATE_LIMITED',
        message: data?.error?.message || retryMessage,
        details: { retryAfter },
      },
      429
    );
  }

  // 3. Backend standardized error format { error: { code, message, details } }
  if (data?.error) {
    return new ApiError(
      {
        code: data.error.code || `HTTP_${status}`,
        message: data.error.message || 'An unexpected error occurred.',
        details: data.error.details,
      },
      status
    );
  }

  // 4. Fallback for other errors
  return new ApiError(
    {
      code: `HTTP_${status}`,
      message: data?.message || axiosErr.message || 'An unexpected error occurred.',
    },
    status
  );
}

/**
 * Maps error codes and validation details to user-friendly messages.
 * Prevents raw [object Object] or technical stack traces from leaking to UI.
 */
export function getFriendlyErrorMessage(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred.'
): string {
  if (!error) return fallbackMessage;
  const apiErr = normalizeError(error);

  const codeMessages: Record<string, string> = {
    UNAUTHORIZED: 'Your session has expired. Please log in again.',
    INVALID_CREDENTIALS: 'The email or password you entered is incorrect.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    RESOURCE_NOT_FOUND: 'The requested resource could not be found.',
    NOT_FOUND: 'The requested resource was not found.',
    RATE_LIMITED: apiErr.message || 'Too many requests. Please wait a moment before trying again.',
    LOGIN_RATE_LIMIT_EXCEEDED: 'Too many login attempts. Please wait a moment before trying again.',
    VALIDATION_ERROR: 'Please check the information you entered.',
    OFFLINE: 'You are currently offline. Please check your internet connection.',
    NETWORK_ERROR: 'Unable to reach the server. Please check your network connection.',
    CSRF_VALIDATION_FAILED: 'Security verification failed. Please refresh the page and try again.',
    CONFLICT: 'A record with this information already exists.',
    FILE_TOO_LARGE: 'The uploaded file exceeds the allowed size limit.',
    INVALID_FILE_TYPE: 'Unsupported file type. Please upload a valid JPEG, PNG, or WebP image.',
    INTERNAL_SERVER_ERROR: 'A temporary server error occurred. Please try again later.',
  };

  let baseMessage = codeMessages[apiErr.code] || apiErr.message || fallbackMessage;

  // Append formatted details if present
  if (apiErr.details) {
    if (Array.isArray(apiErr.details) && apiErr.details.length > 0) {
      const fieldDetails = apiErr.details
        .map((d: unknown) => {
          if (d && typeof d === 'object') {
            const item = d as { field?: string; message?: string };
            return item.message ? `${item.field ? `${item.field}: ` : ''}${item.message}` : '';
          }
          return typeof d === 'string' ? d : '';
        })
        .filter(Boolean)
        .join('; ');
      if (fieldDetails) {
        baseMessage = `${baseMessage} (${fieldDetails})`;
      }
    } else if (typeof apiErr.details === 'string') {
      baseMessage = `${baseMessage} (${apiErr.details})`;
    }
  }

  // Prevent raw object display
  if (baseMessage.includes('[object Object]')) {
    baseMessage = fallbackMessage;
  }

  return baseMessage;
}

// --- Response Interceptor: CSRF retry and 401 token refresh queue ---
api.interceptors.response.use(
  (response) => {
    // If backend returns new CSRF cookie or csrfToken in body, update memory
    if (response.data && typeof response.data === 'object' && 'csrfToken' in response.data) {
      setMemoryCsrfToken(response.data.csrfToken);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomInternalRequestConfig;
    if (!originalRequest) {
      return Promise.reject(normalizeError(error));
    }

    const status = error.response?.status;
    const errorData = error.response?.data as { error?: { code?: string } } | undefined;
    const errorCode = errorData?.error?.code;

    // --- 1. Handle CSRF Token Expiration (403 with CSRF_VALIDATION_FAILED) ---
    if (status === 403 && errorCode === 'CSRF_VALIDATION_FAILED' && !originalRequest._isCsrfRetry) {
      originalRequest._isCsrfRetry = true;
      try {
        const freshCsrf = await getCsrfToken(true);
        if (freshCsrf) {
          originalRequest.headers['X-CSRF-Token'] = freshCsrf;
        }
        return api(originalRequest);
      } catch (csrfErr) {
        return Promise.reject(normalizeError(csrfErr));
      }
    }

    // --- 2. Handle 401 Unauthorized via POST /auth/refresh ---
    const url = originalRequest.url || '';
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (status === 401 && !isAuthRoute) {
      if (originalRequest._isRetry) {
        // Already retried once, session is truly dead
        notifySessionExpired();
        return Promise.reject(normalizeError(error));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            originalRequest._isRetry = true;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(normalizeError(err)));
      }

      originalRequest._isRetry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
          }
        );

        // Refresh succeeded: process queued requests
        processQueue(null);
        isRefreshing = false;

        // Re-execute the original request
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        isRefreshing = false;
        notifySessionExpired();
        return Promise.reject(normalizeError(refreshErr));
      }
    }

    return Promise.reject(normalizeError(error));
  }
);
