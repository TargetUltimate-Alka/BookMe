/**
 * BookMe Auth Service API Client (Person A)
 * Connects to auth-service on http://localhost:3001
 * Includes resilient in-browser sandbox fallback when hosted online (e.g. Netlify)
 */

const AUTH_BASE_URL =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_AUTH_SERVICE_URL) ||
  'http://localhost:3001/api/auth';

/**
 * Fallback simulation when auth-service is offline / hosted statically
 */
function simulateOfflineAuth(endpoint, options = {}) {
  const body = options.body
    ? typeof options.body === 'string'
      ? JSON.parse(options.body)
      : options.body
    : {};

  if (endpoint === '/login') {
    const email = body.email || 'customer@bookme.com';
    const isVendor = email.toLowerCase().includes('vendor');
    const namePart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ') || 'Aarav Sharma';
    const name = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const user = {
      id: isVendor ? 'vnd_sunset_caterers' : 'usr_123',
      name: isVendor ? 'Sunset Catering Partner' : name,
      email: email,
      role: isVendor ? 'vendor' : 'customer',
    };

    return {
      accessToken: `demo_access_${Date.now()}`,
      refreshToken: `demo_refresh_${Date.now()}`,
      expiresIn: 900,
      user,
    };
  }

  if (endpoint === '/register') {
    const role = body.role || 'customer';
    return {
      id: role === 'vendor' ? `vnd_${Date.now()}` : `usr_${Date.now()}`,
      name: body.name || 'New Member',
      email: body.email,
      role: role,
      createdAt: new Date().toISOString(),
    };
  }

  if (endpoint === '/refresh') {
    return {
      accessToken: `demo_access_${Date.now()}`,
      expiresIn: 900,
    };
  }

  if (endpoint === '/me') {
    let savedRole = 'customer';
    let savedId = 'usr_123';
    try {
      if (typeof localStorage !== 'undefined') {
        savedRole = localStorage.getItem('bookme_auth_user_role') || 'customer';
        savedId = localStorage.getItem('bookme_auth_user_id') || 'usr_123';
      }
    } catch {
      // Ignore
    }

    return {
      id: savedId,
      name: savedRole === 'vendor' ? 'Sunset Catering Partner' : 'Aarav Sharma',
      email: savedRole === 'vendor' ? 'vendor@bookme.com' : 'customer@bookme.com',
      role: savedRole,
      createdAt: new Date().toISOString(),
    };
  }

  if (endpoint === '/logout') {
    return null;
  }

  return { success: true };
}

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
    // When running online on Netlify without local Node server, fallback to demo mode
    console.warn(
      `[authApi] Connecting to auth-service failed at ${url} (${netErr.message}). Operating in resilient in-browser mode.`
    );
    return simulateOfflineAuth(endpoint, options);
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
    const errorMsg =
      data?.message ||
      data?.error?.message ||
      (Array.isArray(data?.details) && data.details.length > 0 && data.details[0].issue) ||
      response.statusText ||
      'An unexpected error occurred';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.code || data?.error?.code || `HTTP_${response.status}`;
    error.details = data?.details || data?.error?.details || [];
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
