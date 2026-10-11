/**
 * Base API Client for event-booking-service
 * Supports dynamic configuration, auth headers injection, and SRS §11 error extraction.
 */

const BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    (import.meta.env.VITE_EVENT_BOOKING_SERVICE_URL || import.meta.env.VITE_API_URL)) ||
  'http://localhost:4003';

// Default identity for local testing / DEV_AUTH_BYPASS mode
let currentAuth = {
  userId: 'usr_123',
  userRole: 'customer',
};

export function setAuthContext(userId, userRole) {
  currentAuth = {
    userId: userId || 'usr_123',
    userRole: userRole || 'customer',
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bookme_auth_user_id', currentAuth.userId);
      localStorage.setItem('bookme_auth_user_role', currentAuth.userRole);
    }
  } catch (e) {
    // Ignore storage errors in non-browser envs
  }
}

export function getAuthContext() {
  try {
    if (typeof localStorage !== 'undefined') {
      const storedId = localStorage.getItem('bookme_auth_user_id');
      const storedRole = localStorage.getItem('bookme_auth_user_role');
      if (storedId) currentAuth.userId = storedId;
      if (storedRole) currentAuth.userRole = storedRole;
    }
  } catch (e) {
    // Ignore
  }
  return currentAuth;
}

export async function request(endpoint, options = {}) {
  const auth = getAuthContext();
  const url = `${BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': auth.userId,
    'X-User-Role': auth.userRole,
    'X-Request-Id': `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    const error = new Error(`Network error connecting to event-booking-service at ${url}: ${netErr.message}`);
    error.code = 'NETWORK_ERROR';
    error.details = [];
    throw error;
  }

  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'An unexpected error occurred';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.error?.code || `HTTP_${response.status}`;
    error.details = data?.error?.details || [];
    error.raw = data;
    throw error;
  }

  return data;
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};
