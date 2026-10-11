/**
 * BookMe Auth Service API Client (Person A)
 * Connects to auth-service on http://localhost:3001
 */

const AUTH_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_AUTH_SERVICE_URL) ||
  'http://localhost:3001/api/auth';

/**
 * Helper to make HTTP requests and extract SRS §11 errors
 */
async function request(endpoint, options = {}) {
  const url = `${AUTH_BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    const error = new Error(`Network error connecting to auth-service at ${url}: ${netErr.message}`);
    error.code = 'NETWORK_ERROR';
    error.details = [];
    throw error;
  }

  // 204 No Content has no body
  if (response.status === 204) {
    return null;
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

export const authApi = {
  // POST /api/auth/register
  register: (userData) =>
    request('/register', {
      method: 'POST',
      body: userData,
    }),

  // POST /api/auth/login
  login: (credentials) =>
    request('/login', {
      method: 'POST',
      body: credentials,
    }),

  // POST /api/auth/refresh
  refresh: (refreshToken) =>
    request('/refresh', {
      method: 'POST',
      body: { refreshToken },
    }),

  // POST /api/auth/logout
  logout: (accessToken, refreshToken) =>
    request('/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: refreshToken ? { refreshToken } : undefined,
    }),

  // GET /api/auth/me
  getMe: (accessToken) =>
    request('/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),

  // PATCH /api/auth/me
  updateMe: (accessToken, { name }) =>
    request('/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: { name },
    }),
};
